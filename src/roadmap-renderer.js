/**
 * ExamRoadmap - Phased Roadmap Renderer
 *
 * Renders the active exam as an ordered milestone journey:
 *   Phase 1 (Foundations) -> Phase 2 (High-Yield) -> Phase 3 (Pedagogy/Skills)
 */
(function (global) {
  'use strict';

  var Roadmap = {};
  var filters = { q: '', phase: 'all', priority: 'all', status: 'all' };

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  Roadmap.esc = esc;

  var PRIORITY = {
    high: { label: '🔥 High-Yield', cls: 'high' },
    medium: { label: '⚡ Medium', cls: 'medium' },
    standard: { label: '📌 Standard', cls: 'standard' }
  };

  Roadmap.youtubeUrl = function (unit, topicText) {
    var prefix = (State.exam && State.exam.resourcePrefix) || '';
    var q = prefix + ' ' + (topicText || unit.title);
    return 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q.trim());
  };

  /* ---------------- header ---------------- */

  Roadmap.renderExamHeader = function () {
    var ex = State.exam;
    if (!ex) return;
    var el = document.getElementById('examHeaderInfo');
    if (!el) return;

    el.innerHTML =
      '<h1 class="exam-title">' + esc(ex.title) + '</h1>' +
      '<p class="exam-subtitle">' + esc(ex.titleEn || '') + '</p>' +
      '<div class="exam-meta-row">' +
        '<span class="exam-meta-chip">📚 ' + esc(ex.subject) + '</span>' +
        '<span class="exam-meta-chip">🎯 ' + ex.totalMarks + ' अंक</span>' +
        (ex.totalQuestions ? '<span class="exam-meta-chip">❓ ' + ex.totalQuestions + ' प्रश्न</span>' : '') +
        (ex.durationMinutes ? '<span class="exam-meta-chip">⏱ ' + ex.durationMinutes + ' मिनट</span>' : '') +
        (ex.passingMarks ? '<span class="exam-meta-chip">✅ उत्तीर्ण: ' + ex.passingMarks + '</span>' : '') +
        (ex.negativeMarking ? '<span class="exam-meta-chip">➖ ' + esc(ex.negativeMarking) + '</span>' : '') +
      '</div>';

    var badge = document.getElementById('activeExamBadgeText');
    if (badge) badge.innerText = ex.title;
  };

  /* ---------------- roadmap body ---------------- */

  Roadmap.render = function () {
    var ex = State.exam;
    var container = document.getElementById('roadmapContent');
    if (!ex || !container) return;

    var html = '';
    ex.phases.forEach(function (phase, phaseIdx) {
      html += Roadmap.renderPhase(phase, phaseIdx);
    });
    container.innerHTML = html;

    Roadmap.renderPhaseFilter();
    Roadmap.updateAll();
    Roadmap.applyFilters();
  };

  Roadmap.renderPhase = function (phase, idx) {
    var unitsHtml = phase.units.map(function (u) { return Roadmap.renderUnit(u); }).join('');

    return '' +
      '<section class="phase-block" id="phase_' + esc(phase.id) + '" data-phase-id="' + esc(phase.id) + '">' +
        '<header class="phase-header" onclick="Roadmap.togglePhase(\'' + esc(phase.id) + '\')">' +
          '<div class="phase-marker"><span class="phase-num">' + (idx + 1) + '</span></div>' +
          '<div class="phase-head-text">' +
            '<h2 class="phase-name">' + esc(phase.name) + '</h2>' +
            '<p class="phase-desc">' + esc(phase.description) + '</p>' +
          '</div>' +
          '<div class="phase-head-right">' +
            '<div class="phase-stat" id="phase_stat_' + esc(phase.id) + '">0%</div>' +
            '<div class="phase-bar"><div class="phase-bar-fill" id="phase_bar_' + esc(phase.id) + '"></div></div>' +
            '<span class="phase-chevron" id="phase_chev_' + esc(phase.id) + '">▼</span>' +
          '</div>' +
        '</header>' +
        '<div class="phase-units" id="phase_units_' + esc(phase.id) + '">' + unitsHtml + '</div>' +
      '</section>';
  };

  Roadmap.renderUnit = function (unit) {
    var prio = PRIORITY[unit.priority] || PRIORITY.standard;
    var ytUrl = Roadmap.youtubeUrl(unit, '');

    var topicsHtml = unit.topics.map(function (t) {
      return Roadmap.renderTopicRow(unit, t);
    }).join('');

    return '' +
      '<article class="unit-card" id="unit_' + esc(unit.id) + '" data-unit-id="' + esc(unit.id) + '" data-priority="' + esc(unit.priority) + '">' +
        '<div class="unit-header">' +
          '<div class="unit-title-group">' +
            '<span class="unit-tag">' + esc(unit.unitNum) + '</span>' +
            '<span class="unit-title">' + esc(unit.title) + '</span>' +
            '<span class="badge-priority ' + prio.cls + '">' + prio.label + '</span>' +
            '<span class="badge-weight" title="अनुमानित वेटेज">🎯 ' + esc(unit.estMarks) + '</span>' +
            '<span class="badge-section" title="खंड">' + esc(unit.sectionName) + '</span>' +
          '</div>' +
          '<div class="unit-header-right">' +
            '<div class="unit-ring" id="unit_ring_' + esc(unit.id) + '" title="यूनिट पूर्णता">' +
              '<svg viewBox="0 0 36 36"><circle class="ring-bg" cx="18" cy="18" r="15.9"></circle>' +
              '<circle class="ring-fg" id="unit_ring_fg_' + esc(unit.id) + '" cx="18" cy="18" r="15.9"></circle></svg>' +
              '<span class="ring-label" id="unit_badge_' + esc(unit.id) + '">0%</span>' +
            '</div>' +
            '<span class="unit-status-chip" id="unit_status_' + esc(unit.id) + '">शुरू नहीं</span>' +
            '<a href="' + ytUrl + '" target="_blank" rel="noopener noreferrer" class="unit-yt-btn" title="यूनिट लेक्चर देखें">' +
              '<svg class="yt-icon" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>' +
              'क्लास' +
            '</a>' +
            '<div class="unit-actions">' +
              '<button class="btn-xs" onclick="Roadmap.markUnit(\'' + esc(unit.id) + '\', true)" title="सभी टॉपिक पूर्ण करें">✓ सब पूर्ण</button>' +
              '<button class="btn-xs" onclick="Roadmap.markUnit(\'' + esc(unit.id) + '\', false)" title="यूनिट रीसेट करें">↺ रीसेट</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
        (unit.pyqFocus ? '<div class="unit-pyq-hint">💡 <strong>PYQ मुख्य बिंदु:</strong> ' + esc(unit.pyqFocus) + '</div>' : '') +
        '<div class="topics-list">' + topicsHtml + '</div>' +
      '</article>';
  };

  Roadmap.renderTopicRow = function (unit, topic) {
    var st = State.getTopicState(topic.id);
    var done = State.isTopicComplete(st);
    var revs = State.revisionCount(st);
    var hasNotes = !!(st.notes && st.notes.trim());

    return '' +
      '<div class="topic-row" id="row_' + esc(topic.id) + '" data-topic-id="' + esc(topic.id) + '" data-priority="' + esc(unit.priority) + '">' +
        '<div class="topic-main">' +
          '<input type="checkbox" class="topic-checkbox" id="chk_' + esc(topic.id) + '" ' + (done ? 'checked' : '') +
            ' onchange="Roadmap.toggleTopic(\'' + esc(topic.id) + '\')" aria-label="टॉपिक पूर्ण चिह्नित करें">' +
          '<label class="topic-name ' + (done ? 'completed' : '') + '" id="lbl_' + esc(topic.id) + '" for="chk_' + esc(topic.id) + '">' +
            esc(topic.text) +
          '</label>' +
        '</div>' +
        '<div class="topic-controls">' +
          '<span class="topic-mini-stat" id="mini_' + esc(topic.id) + '">' +
            (revs ? '<span class="mini-chip rev" title="रिवीजन">🔁 ' + revs + '</span>' : '') +
            (st.stars ? '<span class="mini-chip star" title="कॉन्फिडेंस">★ ' + st.stars + '</span>' : '') +
            (st.pyqDone ? '<span class="mini-chip pyq" title="PYQ हल किए">📝 PYQ</span>' : '') +
            (hasNotes ? '<span class="mini-chip note" title="नोट्स मौजूद">🗒</span>' : '') +
          '</span>' +
          '<button class="study-btn" onclick="StudyDrawer.open(\'' + esc(topic.id) + '\')" title="स्टडी पैनल खोलें (रिवीजन, नोट्स, वीडियो)">' +
            '📖 स्टडी' +
          '</button>' +
        '</div>' +
      '</div>';
  };

  /* ---------------- UI updates ---------------- */

  Roadmap.updateAll = function () {
    var ex = State.exam;
    if (!ex) return;
    var s = State.computeStats();

    ex.phases.forEach(function (ph) {
      var p = s.phases[ph.id] || { pct: 0, done: 0, total: 0 };
      var stat = document.getElementById('phase_stat_' + ph.id);
      var bar = document.getElementById('phase_bar_' + ph.id);
      if (stat) stat.innerText = p.pct + '%  (' + p.done + '/' + p.total + ')';
      if (bar) bar.style.width = p.pct + '%';
    });

    State.allUnits().forEach(function (u) {
      var us = s.units[u.id];
      if (!us) return;
      var badge = document.getElementById('unit_badge_' + u.id);
      if (badge) badge.innerText = us.pct + '%';

      var ring = document.getElementById('unit_ring_fg_' + u.id);
      if (ring) {
        var circumference = 2 * Math.PI * 15.9;
        ring.style.strokeDasharray = circumference;
        ring.style.strokeDashoffset = circumference * (1 - us.pct / 100);
      }

      var chip = document.getElementById('unit_status_' + u.id);
      if (chip) {
        var map = {
          not_started: { t: 'शुरू नहीं', c: 'not_started' },
          in_progress: { t: 'जारी है', c: 'in_progress' },
          completed: { t: 'पूर्ण ✓', c: 'completed' }
        };
        var m = map[us.status];
        chip.innerText = m.t;
        chip.className = 'unit-status-chip ' + m.c;
      }
    });

    Roadmap.updateSummary(s);
  };

  Roadmap.updateSummary = function (s) {
    s = s || State.computeStats();
    function set(id, val) {
      var el = document.getElementById(id);
      if (el) el.innerText = val;
    }

    set('overallPercentage', s.overallPct + '%');
    var bar = document.getElementById('overallProgressBar');
    if (bar) bar.style.width = s.overallPct + '%';

    set('completedCount', s.completedTopics + ' / ' + s.totalTopics);
    set('inProgressCount', String(s.inProgressTopics));
    set('highPriorityProgress', s.highCompleted + ' / ' + s.highTotal);
    set('weightedMarksCovered', s.estimatedMarks + ' / ' + s.totalMarks + ' अंक');
    set('totalRevisionCount', String(s.totalRevisions));

    var ex = State.exam;
    var passEl = document.getElementById('passProjection');
    if (passEl && ex && ex.passingMarks) {
      var ok = s.estimatedMarks >= ex.passingMarks;
      passEl.innerText = ok
        ? '✅ अनुमानित स्कोर उत्तीर्ण अंक (' + ex.passingMarks + ') से ऊपर है'
        : '📈 उत्तीर्ण अंक (' + ex.passingMarks + ') तक ' + (ex.passingMarks - s.estimatedMarks) + ' अंक शेष';
      passEl.className = 'pass-projection ' + (ok ? 'ok' : 'pending');
    }
  };

  /* ---------------- interactions ---------------- */

  Roadmap.toggleTopic = function (topicId) {
    var st = State.getTopicState(topicId);
    var chk = document.getElementById('chk_' + topicId);
    st.completed = chk ? chk.checked : !st.completed;
    if (st.completed) {
      if (st.status === 'not_started') st.status = 'mastered';
    } else if (st.status === 'mastered') {
      st.status = 'in_progress';
    }
    Roadmap.refreshTopicRow(topicId);
    State.saveProgress();
  };

  Roadmap.refreshTopicRow = function (topicId) {
    var st = State.getTopicState(topicId);
    var done = State.isTopicComplete(st);

    var chk = document.getElementById('chk_' + topicId);
    if (chk) chk.checked = done;

    var lbl = document.getElementById('lbl_' + topicId);
    if (lbl) lbl.className = 'topic-name ' + (done ? 'completed' : '');

    var mini = document.getElementById('mini_' + topicId);
    if (mini) {
      var revs = State.revisionCount(st);
      var hasNotes = !!(st.notes && st.notes.trim());
      mini.innerHTML =
        (revs ? '<span class="mini-chip rev" title="रिवीजन">🔁 ' + revs + '</span>' : '') +
        (st.stars ? '<span class="mini-chip star" title="कॉन्फिडेंस">★ ' + st.stars + '</span>' : '') +
        (st.pyqDone ? '<span class="mini-chip pyq" title="PYQ हल किए">📝 PYQ</span>' : '') +
        (hasNotes ? '<span class="mini-chip note" title="नोट्स मौजूद">🗒</span>' : '');
    }
    Roadmap.updateAll();
  };

  Roadmap.markUnit = function (unitId, complete) {
    var unit = State.findUnit(unitId);
    if (!unit) return;
    unit.topics.forEach(function (t) {
      var st = State.getTopicState(t.id);
      st.completed = complete;
      st.status = complete ? 'mastered' : 'not_started';
      if (!complete) {
        st.revisions = 0;
        st.revisionTiers = {};
        st.stars = 0;
        st.pyqDone = false;
        // Notes are the student's own writing, so a unit reset keeps them.
      }
      Roadmap.refreshTopicRow(t.id);
    });
    State.saveProgress();
    if (global.showToast) {
      showToast(complete ? '✓ यूनिट पूर्ण चिह्नित की गई' : '↺ यूनिट रीसेट हुई (नोट्स सुरक्षित हैं)', complete ? 'success' : 'info');
    }
  };

  Roadmap.togglePhase = function (phaseId) {
    var body = document.getElementById('phase_units_' + phaseId);
    var chev = document.getElementById('phase_chev_' + phaseId);
    if (!body) return;
    var hidden = body.classList.toggle('collapsed');
    if (chev) chev.innerText = hidden ? '▶' : '▼';
  };

  /* ---------------- filters ---------------- */

  Roadmap.renderPhaseFilter = function () {
    var sel = document.getElementById('phaseFilter');
    if (!sel || !State.exam) return;
    var cur = sel.value || 'all';
    sel.innerHTML = '<option value="all">सभी चरण (All Phases)</option>' +
      State.exam.phases.map(function (p) {
        return '<option value="' + esc(p.id) + '">' + esc(p.name) + '</option>';
      }).join('');
    sel.value = State.exam.phases.some(function (p) { return p.id === cur; }) ? cur : 'all';
  };

  Roadmap.setFilter = function (key, value) {
    filters[key] = value;
    Roadmap.applyFilters();
  };

  Roadmap.applyFilters = function () {
    var ex = State.exam;
    if (!ex) return;

    var qEl = document.getElementById('searchInput');
    filters.q = qEl ? qEl.value.trim().toLowerCase() : '';
    var pf = document.getElementById('phaseFilter');
    var prf = document.getElementById('priorityFilter');
    var sf = document.getElementById('statusFilter');
    if (pf) filters.phase = pf.value;
    if (prf) filters.priority = prf.value;
    if (sf) filters.status = sf.value;

    var visibleTopics = 0;

    ex.phases.forEach(function (ph) {
      var phEl = document.getElementById('phase_' + ph.id);
      if (!phEl) return;

      if (filters.phase !== 'all' && filters.phase !== ph.id) {
        phEl.style.display = 'none';
        return;
      }

      var anyUnit = false;
      ph.units.forEach(function (u) {
        var uEl = document.getElementById('unit_' + u.id);
        if (!uEl) return;

        if (filters.priority !== 'all' && u.priority !== filters.priority) {
          uEl.style.display = 'none';
          return;
        }

        var anyTopic = false;
        u.topics.forEach(function (t) {
          var row = document.getElementById('row_' + t.id);
          if (!row) return;
          var st = State.getTopicState(t.id);

          var matchQ = !filters.q ||
            t.text.toLowerCase().indexOf(filters.q) !== -1 ||
            u.title.toLowerCase().indexOf(filters.q) !== -1 ||
            (u.pyqFocus || '').toLowerCase().indexOf(filters.q) !== -1 ||
            (st.notes || '').toLowerCase().indexOf(filters.q) !== -1;

          var matchStatus = true;
          if (filters.status === 'completed') matchStatus = State.isTopicComplete(st);
          else if (filters.status === 'pending') matchStatus = !State.isTopicComplete(st);
          else if (filters.status === 'in_progress') {
            matchStatus = !State.isTopicComplete(st) && st.status !== 'not_started';
          } else if (filters.status === 'needs_revision') {
            matchStatus = State.isTopicComplete(st) && State.revisionCount(st) < 3;
          } else if (filters.status === 'low_confidence') {
            matchStatus = st.stars > 0 && st.stars <= 2;
          }

          var show = matchQ && matchStatus;
          row.style.display = show ? '' : 'none';
          if (show) { anyTopic = true; visibleTopics++; }
        });

        uEl.style.display = anyTopic ? '' : 'none';
        if (anyTopic) anyUnit = true;
      });

      phEl.style.display = anyUnit ? '' : 'none';
    });

    var empty = document.getElementById('emptyFilterState');
    if (empty) empty.style.display = visibleTopics === 0 ? 'block' : 'none';
  };

  Roadmap.resetFilters = function () {
    ['searchInput'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.value = '';
    });
    ['phaseFilter', 'priorityFilter', 'statusFilter'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.value = 'all';
    });
    Roadmap.applyFilters();
  };

  global.Roadmap = Roadmap;
})(window);
