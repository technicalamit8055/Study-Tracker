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
      if (body) body.innerHTML = '<div class="catalog-loading">' + esc(I18n.t('catalog.loading')) + '</div>';
      try {
        await State.fetchCatalog();
      } catch (e) {
        if (body) body.innerHTML = '<div class="catalog-loading">' + esc(I18n.t('catalog.loadFailed')) + '</div>';
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
          'onclick="Catalog.setCategory(\'all\')">' + esc(I18n.t('catalog.all')) + ' (' + cat.exams.length + ')</button>' +
        cat.categories.map(function (c) {
          var n = counts[c.id] || 0;
          if (!n) return '';
          return '<button class="cat-tab ' + (Catalog.activeCategory === c.id ? 'active' : '') + '" ' +
            'onclick="Catalog.setCategory(\'' + esc(c.id) + '\')">' + c.icon + ' ' + esc(I18n.categoryName(c)) + ' (' + n + ')</button>';
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
        (e.tagline || '') + ' ' + ((catById[e.categoryId] || {}).name || '') + ' ' +
        ((catById[e.categoryId] || {}).nameHi || '')).toLowerCase();
      return hay.indexOf(Catalog.query) !== -1;
    });

    if (!list.length) {
      body.innerHTML = '<div class="catalog-loading">' + esc(I18n.t('catalog.noneFound')) + '</div>';
      return;
    }

    body.innerHTML = '<div class="catalog-grid">' + list.map(function (e) {
      var c = catById[e.categoryId] || { color: '#666', icon: '📘', name: '' };
      var isActive = e.id === State.activeExamId;
      var prog = Catalog.examProgress(e.id);
      var pctLine = '';

      if (!e.available) {
        pctLine = '<div class="ec-progress soon">' + esc(I18n.t('catalog.comingSoon')) + '</div>';
      } else if (prog && prog.done > 0) {
        pctLine = '<div class="ec-progress"><span class="ec-dot started"></span>' +
          esc(I18n.t('catalog.topicsDone', { n: prog.done })) + '</div>';
      } else {
        pctLine = '<div class="ec-progress"><span class="ec-dot"></span>' + esc(I18n.t('catalog.notStarted')) + '</div>';
      }

      var btn;
      if (!e.available) {
        btn = '<button class="ec-btn disabled" disabled>' + esc(I18n.t('catalog.unavailable')) + '</button>';
      } else if (isActive) {
        btn = '<button class="ec-btn current" onclick="Catalog.close()">' + esc(I18n.t('catalog.current')) + '</button>';
      } else if (prog && prog.done > 0) {
        btn = '<button class="ec-btn" onclick="Catalog.choose(\'' + esc(e.id) + '\')">' + esc(I18n.t('catalog.continue')) + '</button>';
      } else {
        btn = '<button class="ec-btn" onclick="Catalog.choose(\'' + esc(e.id) + '\')">' + esc(I18n.t('catalog.start')) + '</button>';
      }

      return '' +
        '<div class="exam-card ' + (isActive ? 'active' : '') + ' ' + (e.available ? '' : 'unavailable') + '">' +
          '<div class="ec-cat" style="color:' + esc(c.color) + '">' + c.icon + ' ' + esc(I18n.categoryName(c)) + '</div>' +
          '<h4 class="ec-title">' + esc(I18n.examTitle(e)) + '</h4>' +
          '<div class="ec-sub">' + esc(I18n.lang === 'en' ? (e.title || '') : (e.titleEn || '')) + '</div>' +
          '<div class="ec-tagline">' + esc(e.tagline || '') + '</div>' +
          '<div class="ec-meta">' +
            '<span>🎯 ' + e.totalMarks + ' ' + esc(I18n.t('progress.marks')) + '</span>' +
            (e.totalQuestions ? '<span>❓ ' + e.totalQuestions + '</span>' : '') +
            (e.durationMinutes ? '<span>⏱ ' + e.durationMinutes + 'm</span>' : '') +
          '</div>' +
          pctLine + btn +
        '</div>';
    }).join('') + '</div>';
  };

  Catalog.choose = async function (examId) {
    var body = document.getElementById('catalogBody');
    if (body) body.innerHTML = '<div class="catalog-loading">' + esc(I18n.t('catalog.loadingRoadmap')) + '</div>';
    try {
      // Flush any pending edits for the current exam before switching away.
      if (State.authToken && State.activeExamId) {
        await State.pushCloudProgress(false);
      }
      await State.activateExam(examId);
      Catalog.close();
      if (global.showToast) showToast(I18n.t('catalog.switched', { title: I18n.pick(State.exam, 'title', 'titleEn') }), 'success');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      if (body) body.innerHTML = '<div class="catalog-loading">' + esc(I18n.t('catalog.switchFailed', { msg: e.message })) + '</div>';
    }
  };

  global.Catalog = Catalog;
})(window);
