/**
 * ExamRoadmap - Exam Catalog & Switcher
 *
 * Browse every available exam grouped by category, see per-exam completion,
 * and switch the active roadmap without a page reload.
 */
(function (global) {
  'use strict';

  var Catalog = { activeCategory: 'all', query: '' };

  function esc(s) { return Roadmap.esc(s); }

  /**
   * Completion % for any exam, read from that exam's own localStorage bucket
   * so the catalog can show progress for roadmaps that are not loaded.
   */
  Catalog.examProgress = function (examId) {
    try {
      var raw = localStorage.getItem(State.KEYS.progressPrefix + examId);
      if (!raw && examId === State.LEGACY_EXAM_ID) {
        raw = localStorage.getItem('bihar_stet_2026_psychology_tracker_v2');
      }
      if (!raw) return null;
      var data = JSON.parse(raw);
      var ids = Object.keys(data);
      if (!ids.length) return null;
      var done = ids.filter(function (k) {
        var s = data[k];
        return s && (s.completed || s.status === 'mastered');
      }).length;
      return { done: done, touched: ids.length };
    } catch (e) {
      return null;
    }
  };

  Catalog.open = async function () {
    var modal = document.getElementById('catalogModal');
    if (modal) modal.classList.add('open');
    if (!State.catalog) {
      var body = document.getElementById('catalogBody');
      if (body) body.innerHTML = '<div class="catalog-loading">लोड हो रहा है…</div>';
      try {
        await State.fetchCatalog();
      } catch (e) {
        if (body) body.innerHTML = '<div class="catalog-loading">कैटलॉग लोड नहीं हो सका।</div>';
        return;
      }
    }
    Catalog.render();
  };

  Catalog.close = function () {
    var modal = document.getElementById('catalogModal');
    if (modal) modal.classList.remove('open');
  };

  Catalog.setCategory = function (catId) {
    Catalog.activeCategory = catId;
    Catalog.render();
  };

  Catalog.setQuery = function (q) {
    Catalog.query = (q || '').trim().toLowerCase();
    Catalog.renderCards();
  };

  Catalog.render = function () {
    var cat = State.catalog;
    if (!cat) return;

    var tabs = document.getElementById('catalogTabs');
    if (tabs) {
      var counts = {};
      cat.exams.forEach(function (e) {
        counts[e.categoryId] = (counts[e.categoryId] || 0) + 1;
      });
      tabs.innerHTML =
        '<button class="cat-tab ' + (Catalog.activeCategory === 'all' ? 'active' : '') + '" ' +
          'onclick="Catalog.setCategory(\'all\')">सभी (' + cat.exams.length + ')</button>' +
        cat.categories.map(function (c) {
          var n = counts[c.id] || 0;
          if (!n) return '';
          return '<button class="cat-tab ' + (Catalog.activeCategory === c.id ? 'active' : '') + '" ' +
            'onclick="Catalog.setCategory(\'' + esc(c.id) + '\')">' + c.icon + ' ' + esc(c.nameHi || c.name) + ' (' + n + ')</button>';
        }).join('');
    }
    Catalog.renderCards();
  };

  Catalog.renderCards = function () {
    var cat = State.catalog;
    var body = document.getElementById('catalogBody');
    if (!cat || !body) return;

    var catById = {};
    cat.categories.forEach(function (c) { catById[c.id] = c; });

    var list = cat.exams.filter(function (e) {
      if (Catalog.activeCategory !== 'all' && e.categoryId !== Catalog.activeCategory) return false;
      if (!Catalog.query) return true;
      var hay = (e.title + ' ' + (e.titleEn || '') + ' ' + (e.subject || '') + ' ' +
        (e.tagline || '') + ' ' + ((catById[e.categoryId] || {}).name || '')).toLowerCase();
      return hay.indexOf(Catalog.query) !== -1;
    });

    if (!list.length) {
      body.innerHTML = '<div class="catalog-loading">कोई परीक्षा नहीं मिली। खोज बदलकर देखें।</div>';
      return;
    }

    body.innerHTML = '<div class="catalog-grid">' + list.map(function (e) {
      var c = catById[e.categoryId] || { color: '#666', icon: '📘', name: '' };
      var isActive = e.id === State.activeExamId;
      var prog = Catalog.examProgress(e.id);
      var pctLine = '';

      if (!e.available) {
        pctLine = '<div class="ec-progress soon">जल्द आ रहा है</div>';
      } else if (prog && prog.done > 0) {
        pctLine = '<div class="ec-progress"><span class="ec-dot started"></span>' +
          prog.done + ' टॉपिक पूर्ण</div>';
      } else {
        pctLine = '<div class="ec-progress"><span class="ec-dot"></span>अभी शुरू नहीं किया</div>';
      }

      var btn;
      if (!e.available) {
        btn = '<button class="ec-btn disabled" disabled>उपलब्ध नहीं</button>';
      } else if (isActive) {
        btn = '<button class="ec-btn current" onclick="Catalog.close()">✓ वर्तमान रोडमैप</button>';
      } else if (prog && prog.done > 0) {
        btn = '<button class="ec-btn" onclick="Catalog.choose(\'' + esc(e.id) + '\')">जारी रखें →</button>';
      } else {
        btn = '<button class="ec-btn" onclick="Catalog.choose(\'' + esc(e.id) + '\')">रोडमैप शुरू करें →</button>';
      }

      return '' +
        '<div class="exam-card ' + (isActive ? 'active' : '') + ' ' + (e.available ? '' : 'unavailable') + '">' +
          '<div class="ec-cat" style="color:' + esc(c.color) + '">' + c.icon + ' ' + esc(c.nameHi || c.name) + '</div>' +
          '<h4 class="ec-title">' + esc(e.title) + '</h4>' +
          '<div class="ec-sub">' + esc(e.titleEn || '') + '</div>' +
          '<div class="ec-tagline">' + esc(e.tagline || '') + '</div>' +
          '<div class="ec-meta">' +
            '<span>🎯 ' + e.totalMarks + ' अंक</span>' +
            (e.totalQuestions ? '<span>❓ ' + e.totalQuestions + '</span>' : '') +
            (e.durationMinutes ? '<span>⏱ ' + e.durationMinutes + 'm</span>' : '') +
          '</div>' +
          pctLine + btn +
        '</div>';
    }).join('') + '</div>';
  };

  Catalog.choose = async function (examId) {
    var body = document.getElementById('catalogBody');
    if (body) body.innerHTML = '<div class="catalog-loading">रोडमैप लोड हो रहा है…</div>';
    try {
      // Flush any pending edits for the current exam before switching away.
      if (State.authToken && State.activeExamId) {
        await State.pushCloudProgress(false);
      }
      await State.activateExam(examId);
      Catalog.close();
      if (global.showToast) showToast('🎯 रोडमैप बदला: ' + State.exam.title, 'success');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      if (body) body.innerHTML = '<div class="catalog-loading">रोडमैप लोड नहीं हो सका: ' + esc(e.message) + '</div>';
    }
  };

  global.Catalog = Catalog;
})(window);
