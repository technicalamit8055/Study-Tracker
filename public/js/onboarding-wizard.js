/**
 * ExamRoadmap - Onboarding Wizard
 *
 * A seven-step setup that turns a first-time visitor into a student with a
 * concrete plan: app language, target exam, exam medium, daily capacity, and
 * a phased 80/20 strategy derived from their own dates and hours.
 *
 * Runs automatically when `examroadmap_onboarding_done` is unset, and can be
 * relaunched at any time from the "My Goal & Guide" header button — in which
 * case it opens pre-filled and saves without re-running the celebration.
 */
(function (global) {
  'use strict';

  var Onboarding = {
    step: 1,
    TOTAL: 7,
    draft: null,
    isEditing: false,   // relaunched by an existing user
    _open: false
  };

  var HOUR_OPTIONS = [
    { v: 2, key: 'ob.s4.hoursCasual' },
    { v: 4, key: 'ob.s4.hoursSerious' },
    { v: 6, key: 'ob.s4.hoursFull' }
  ];

  var MEDIA = [
    { v: 'en', labelKey: 'medium.en', descKey: 'ob.s3.mediumEnDesc', icon: '🇬🇧' },
    { v: 'hi', labelKey: 'medium.hi', descKey: 'ob.s3.mediumHiDesc', icon: '🇮🇳' },
    { v: 'bilingual', labelKey: 'medium.bilingual', descKey: 'ob.s3.mediumBiDesc', icon: '🌐' }
  ];

  var STAGES = [
    { v: 'beginner', labelKey: 'ob.s1.beginner', descKey: 'ob.s1.beginnerDesc', icon: '🌱' },
    { v: 'intermediate', labelKey: 'ob.s1.intermediate', descKey: 'ob.s1.intermediateDesc', icon: '📈' },
    { v: 'revision', labelKey: 'ob.s1.revision', descKey: 'ob.s1.revisionDesc', icon: '🔁' }
  ];

  var DATE_CHIPS = [
    { days: 30, key: 'ob.s3.in30' },
    { days: 60, key: 'ob.s3.in60' },
    { days: 90, key: 'ob.s3.in90' },
    { days: 180, key: 'ob.s3.in180' }
  ];

  var FEATURES = [
    { icon: '🎯', titleKey: 'ob.s6.f1', descKey: 'ob.s6.f1Desc', accent: 'var(--high-p)' },
    { icon: '🔁', titleKey: 'ob.s6.f2', descKey: 'ob.s6.f2Desc', accent: 'var(--info)' },
    { icon: '▶️', titleKey: 'ob.s6.f3', descKey: 'ob.s6.f3Desc', accent: 'var(--yt-red)' },
    { icon: '⏱', titleKey: 'ob.s6.f4', descKey: 'ob.s6.f4Desc', accent: 'var(--success)' }
  ];

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function t(k, v) { return I18n.t(k, v); }

  function isoAfterDays(n) {
    var d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  }

  function todayIso() {
    return new Date().toISOString().slice(0, 10);
  }

  /* ---------------- lifecycle ---------------- */

  Onboarding.init = function () {
    // Keep the wizard's own chrome translated when the language changes.
    I18n.onChange(function () {
      if (Onboarding._open) Onboarding.render();
    });

    if (!State.hasOnboarded()) {
      // Let the first roadmap paint behind the modal so the app feels alive.
      setTimeout(function () { Onboarding.open(false); }, 450);
    }
  };

  /**
   * @param {boolean} editing true when relaunched from "My Goal & Guide"
   */
  Onboarding.open = function (editing) {
    var saved = State.getProfile();
    Onboarding.isEditing = !!editing;
    Onboarding.draft = Object.assign(
      State.blankProfile(),
      saved || {},
      { appLanguage: I18n.lang }
    );
    // Returning users edit the exam they are actually on.
    if (editing && !Onboarding.draft.targetExamId) {
      Onboarding.draft.targetExamId = State.activeExamId;
    }

    Onboarding.step = 1;
    Onboarding._open = true;

    var modal = document.getElementById('onboardingModal');
    if (modal) modal.classList.add('open');
    document.body.classList.add('onboarding-open');

    Onboarding.render();
    Onboarding.ensureCatalog();
  };

  Onboarding.close = function () {
    Onboarding._open = false;
    var modal = document.getElementById('onboardingModal');
    if (modal) modal.classList.remove('open');
    document.body.classList.remove('onboarding-open');
  };

  /**
   * Dismissing without finishing still counts as onboarded, so we do not nag.
   * The exam choice is dropped rather than saved: the wizard never activated
   * that roadmap, and a profile pointing at an exam the app is not showing
   * would send the student somewhere unexpected on their next visit.
   */
  Onboarding.skip = function () {
    var partial = Object.assign({}, Onboarding.draft, {
      targetExamId: State.activeExamId || null,
      onboardingDone: true
    });
    State.saveProfile(partial);
    Onboarding.close();
  };

  Onboarding.ensureCatalog = async function () {
    if (State.catalog) return;
    try {
      await State.fetchCatalog();
      if (Onboarding._open) Onboarding.render();
    } catch (e) {
      console.warn('Onboarding catalog unavailable:', e.message);
    }
  };

  /* ---------------- navigation ---------------- */

  Onboarding.canAdvance = function () {
    var d = Onboarding.draft;
    if (Onboarding.step === 2) return !!d.targetExamId;
    return true;
  };

  Onboarding.next = function () {
    if (!Onboarding.canAdvance()) {
      if (global.showToast) showToast(t('ob.required'), 'error');
      return;
    }
    if (Onboarding.step < Onboarding.TOTAL) {
      Onboarding.step++;
      Onboarding.render();
      Onboarding.scrollTop();
    }
  };

  Onboarding.back = function () {
    if (Onboarding.step > 1) {
      Onboarding.step--;
      Onboarding.render();
      Onboarding.scrollTop();
    }
  };

  Onboarding.goTo = function (n) {
    // Only allow jumping back to a step already completed.
    if (n < Onboarding.step) {
      Onboarding.step = n;
      Onboarding.render();
      Onboarding.scrollTop();
    }
  };

  Onboarding.scrollTop = function () {
    var body = document.getElementById('onboardingBody');
    if (body) body.scrollTop = 0;
  };

  /* ---------------- field setters ---------------- */

  Onboarding.setLang = function (code) {
    Onboarding.draft.appLanguage = code;
    // Switch the whole app immediately — the preview *is* the confirmation.
    I18n.setLang(code);
    Onboarding.render();
  };

  Onboarding.setName = function (v) {
    Onboarding.draft.name = v;
  };

  Onboarding.setStage = function (v) {
    Onboarding.draft.prepLevel = v;
    Onboarding.render();
  };

  Onboarding.setExam = function (id) {
    Onboarding.draft.targetExamId = id;
    Onboarding.render();
  };

  Onboarding.setMedium = function (v) {
    Onboarding.draft.examMedium = v;
    Onboarding.render();
  };

  Onboarding.setDateInDays = function (n) {
    Onboarding.draft.targetDate = isoAfterDays(n);
    Onboarding.render();
  };

  Onboarding.setDate = function (v) {
    Onboarding.draft.targetDate = v || null;
    Onboarding.render();
  };

  Onboarding.setHours = function (n) {
    Onboarding.draft.dailyHours = n;
    Onboarding.render();
  };

  Onboarding.setPomodoros = function (n) {
    Onboarding.draft.dailyPomodoros = parseInt(n, 10) || 4;
    var out = document.getElementById('obPomoValue');
    var help = document.getElementById('obPomoHelp');
    if (out) out.innerText = Onboarding.draft.dailyPomodoros;
    if (help) help.innerText = t('ob.s4.pomoHelp', { mins: Onboarding.draft.dailyPomodoros * 25 });
  };

  Onboarding.setScore = function (kind) {
    var ex = Onboarding.selectedExam();
    var total = (ex && ex.totalMarks) || 100;
    var passing = (ex && ex.passingMarks) || Math.round(total * 0.4);
    Onboarding.draft.targetScore = kind === 'top' ? Math.round(total * 0.8) : passing;
    Onboarding.draft._scoreKind = kind;
    Onboarding.render();
  };

  Onboarding.selectedExam = function () {
    if (!State.catalog || !Onboarding.draft.targetExamId) return null;
    return State.catalog.exams.find(function (e) {
      return e.id === Onboarding.draft.targetExamId;
    }) || null;
  };

  /* ---------------- finish ---------------- */

  Onboarding.finish = async function (withCloud) {
    var d = Onboarding.draft;
    var wasEditing = Onboarding.isEditing;

    State.saveProfile({
      name: (d.name || '').trim(),
      appLanguage: I18n.lang,
      targetExamId: d.targetExamId,
      examMedium: d.examMedium,
      targetDate: d.targetDate,
      dailyHours: d.dailyHours,
      dailyPomodoros: d.dailyPomodoros,
      prepLevel: d.prepLevel,
      targetScore: d.targetScore,
      onboardingDone: true
    });

    Onboarding.close();

    // Load the chosen roadmap if it is not the one already on screen.
    if (d.targetExamId && d.targetExamId !== State.activeExamId) {
      try {
        await State.activateExam(d.targetExamId);
      } catch (e) {
        if (global.showToast) showToast(t('catalog.switchFailed', { msg: e.message }), 'error');
      }
    }

    if (wasEditing) {
      if (global.showToast) showToast(t('ob.saved'), 'success');
    } else {
      Onboarding.celebrate();
      if (global.showToast) showToast(t('ob.launched'), 'success');
    }

    if (withCloud && !State.authToken && global.openAuthModal) {
      setTimeout(function () { openAuthModal(); }, 700);
    }
  };

  /** Lightweight confetti — no library, cleans itself up after the animation. */
  Onboarding.celebrate = function () {
    var layer = document.createElement('div');
    layer.className = 'confetti-layer';
    var colors = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#0ea5e9', '#a855f7'];

    for (var i = 0; i < 70; i++) {
      var bit = document.createElement('span');
      bit.className = 'confetti-bit';
      bit.style.left = Math.random() * 100 + '%';
      bit.style.background = colors[i % colors.length];
      bit.style.animationDelay = (Math.random() * 0.6).toFixed(2) + 's';
      bit.style.animationDuration = (2.4 + Math.random() * 1.4).toFixed(2) + 's';
      bit.style.transform = 'rotate(' + Math.floor(Math.random() * 360) + 'deg)';
      layer.appendChild(bit);
    }

    document.body.appendChild(layer);
    setTimeout(function () {
      if (layer.parentNode) layer.parentNode.removeChild(layer);
    }, 4200);
  };

  /* ---------------- rendering ---------------- */

  Onboarding.render = function () {
    var body = document.getElementById('onboardingBody');
    var footer = document.getElementById('onboardingFooter');
    var rail = document.getElementById('onboardingRail');
    if (!body) return;

    if (rail) rail.innerHTML = Onboarding.renderRail();

    var fn = Onboarding['renderStep' + Onboarding.step];
    body.innerHTML = fn ? fn() : '';
    if (footer) footer.innerHTML = Onboarding.renderFooter();

    var modal = document.getElementById('onboardingModal');
    if (modal) modal.setAttribute('data-step', String(Onboarding.step));
  };

  Onboarding.renderRail = function () {
    var dots = '';
    for (var i = 1; i <= Onboarding.TOTAL; i++) {
      var cls = i === Onboarding.step ? 'active' : (i < Onboarding.step ? 'done' : '');
      dots += '<button class="ob-dot ' + cls + '" onclick="Onboarding.goTo(' + i + ')" ' +
        'aria-label="' + esc(t('ob.step', { n: i, total: Onboarding.TOTAL })) + '">' +
        (i < Onboarding.step ? '✓' : i) + '</button>';
    }
    var pct = Math.round(((Onboarding.step - 1) / (Onboarding.TOTAL - 1)) * 100);
    return '<div class="ob-rail-track"><div class="ob-rail-fill" style="width:' + pct + '%"></div></div>' +
      '<div class="ob-dots">' + dots + '</div>';
  };

  Onboarding.renderFooter = function () {
    var step = Onboarding.step;
    var stepLabel = '<span class="ob-step-label">' +
      esc(t('ob.step', { n: step, total: Onboarding.TOTAL })) + '</span>';

    if (step === Onboarding.TOTAL) {
      // The launch step carries its own primary actions.
      return '<div class="ob-footer-inner">' +
        '<button class="ob-btn ghost" onclick="Onboarding.back()">' + esc(t('ob.back')) + '</button>' +
        stepLabel +
        '<span></span>' +
      '</div>';
    }

    return '<div class="ob-footer-inner">' +
      (step > 1
        ? '<button class="ob-btn ghost" onclick="Onboarding.back()">' + esc(t('ob.back')) + '</button>'
        : '<button class="ob-btn ghost" onclick="Onboarding.skip()">' + esc(t('ob.skip')) + '</button>') +
      stepLabel +
      '<button class="ob-btn primary ' + (Onboarding.canAdvance() ? '' : 'disabled') + '" ' +
        'onclick="Onboarding.next()">' + esc(t('ob.next')) + '</button>' +
    '</div>';
  };

  function head(titleKey, subKey, vars) {
    return '<div class="ob-head">' +
      '<h2 class="ob-title">' + esc(t(titleKey, vars)) + '</h2>' +
      '<p class="ob-sub">' + esc(t(subKey, vars)) + '</p>' +
    '</div>';
  }

  /* --- Step 1: welcome, language, name, stage --- */

  Onboarding.renderStep1 = function () {
    var d = Onboarding.draft;

    var langs = I18n.LANGS.map(function (l) {
      var active = I18n.lang === l.code;
      return '<button class="ob-lang-pill ' + (active ? 'active' : '') + '" ' +
        'onclick="Onboarding.setLang(\'' + l.code + '\')">' +
        '<span class="ob-lang-flag">' + l.flag + '</span>' +
        '<span class="ob-lang-name">' + esc(l.native) + '</span>' +
        (l.code === I18n.DEFAULT_LANG ? '<span class="ob-lang-default">Default</span>' : '') +
      '</button>';
    }).join('');

    var stages = STAGES.map(function (s) {
      return '<button class="ob-card ' + (d.prepLevel === s.v ? 'selected' : '') + '" ' +
        'onclick="Onboarding.setStage(\'' + s.v + '\')">' +
        '<span class="ob-card-icon">' + s.icon + '</span>' +
        '<span class="ob-card-title">' + esc(t(s.labelKey)) + '</span>' +
        '<span class="ob-card-desc">' + esc(t(s.descKey)) + '</span>' +
      '</button>';
    }).join('');

    return '' +
      '<div class="ob-hero">🎓</div>' +
      head('ob.s1.title', 'ob.s1.subtitle') +

      '<div class="ob-field">' +
        '<label class="ob-label">' + esc(t('ob.s1.langLabel')) + '</label>' +
        '<div class="ob-lang-row">' + langs + '</div>' +
        '<p class="ob-help">' + esc(t('ob.s1.langHelp')) + '</p>' +
      '</div>' +

      '<div class="ob-field">' +
        '<label class="ob-label" for="obName">' + esc(t('ob.s1.nameLabel')) +
          ' <span class="ob-optional">(' + esc(t('common.optional')) + ')</span></label>' +
        '<input type="text" id="obName" class="ob-input" value="' + esc(d.name || '') + '" ' +
          'placeholder="' + esc(t('ob.s1.namePh')) + '" oninput="Onboarding.setName(this.value)" ' +
          'autocomplete="given-name">' +
      '</div>' +

      '<div class="ob-field">' +
        '<label class="ob-label">' + esc(t('ob.s1.stageLabel')) + '</label>' +
        '<div class="ob-card-grid three">' + stages + '</div>' +
      '</div>';
  };

  /* --- Step 2: target exam --- */

  Onboarding.renderStep2 = function () {
    var d = Onboarding.draft;
    var cat = State.catalog;

    if (!cat) {
      return head('ob.s2.title', 'ob.s2.subtitle') +
        '<div class="ob-loading">' + esc(t('catalog.loading')) + '</div>';
    }

    var catById = {};
    cat.categories.forEach(function (c) { catById[c.id] = c; });

    // Available exams first — a student should not scroll past "coming soon".
    var exams = cat.exams.slice().sort(function (a, b) {
      if (a.available !== b.available) return a.available ? -1 : 1;
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return 0;
    });

    var cards = exams.map(function (e) {
      var c = catById[e.categoryId] || { color: 'var(--primary)', icon: '📘' };
      var selected = d.targetExamId === e.id;
      var click = e.available
        ? ' onclick="Onboarding.setExam(\'' + esc(e.id) + '\')"'
        : ' disabled';

      return '<button class="ob-exam-card ' + (selected ? 'selected' : '') + ' ' +
          (e.available ? '' : 'unavailable') + '"' + click + '>' +
        '<span class="ob-exam-cat" style="color:' + esc(c.color) + '">' +
          c.icon + ' ' + esc(I18n.categoryName(c)) + '</span>' +
        '<span class="ob-exam-title">' + esc(I18n.examTitle(e)) + '</span>' +
        '<span class="ob-exam-sub">' + esc(e.subject || '') + '</span>' +
        '<span class="ob-exam-meta">' +
          '<span>🎯 ' + esc(t('ob.s2.marks', { n: e.totalMarks })) + '</span>' +
          (e.totalQuestions ? '<span>❓ ' + esc(t('ob.s2.questions', { n: e.totalQuestions })) + '</span>' : '') +
          (e.durationMinutes ? '<span>⏱ ' + esc(t('ob.s2.mins', { n: e.durationMinutes })) + '</span>' : '') +
        '</span>' +
        (e.available ? '' : '<span class="ob-exam-soon">' + esc(t('ob.s2.soon')) + '</span>') +
        (selected ? '<span class="ob-exam-check">✓</span>' : '') +
      '</button>';
    }).join('');

    return head('ob.s2.title', 'ob.s2.subtitle') +
      '<div class="ob-exam-grid">' + cards + '</div>';
  };

  /* --- Step 3: exam medium + target date --- */

  Onboarding.renderStep3 = function () {
    var d = Onboarding.draft;

    var media = MEDIA.map(function (m) {
      return '<button class="ob-medium-card ' + (d.examMedium === m.v ? 'selected' : '') + '" ' +
        'onclick="Onboarding.setMedium(\'' + m.v + '\')">' +
        '<span class="ob-medium-radio"></span>' +
        '<span class="ob-medium-icon">' + m.icon + '</span>' +
        '<span class="ob-medium-text">' +
          '<span class="ob-medium-title">' + esc(t(m.labelKey)) + '</span>' +
          '<span class="ob-medium-desc">' + esc(t(m.descKey)) + '</span>' +
        '</span>' +
      '</button>';
    }).join('');

    var chips = DATE_CHIPS.map(function (c) {
      var iso = isoAfterDays(c.days);
      var active = d.targetDate === iso;
      return '<button class="ob-chip ' + (active ? 'active' : '') + '" ' +
        'onclick="Onboarding.setDateInDays(' + c.days + ')">' + esc(t(c.key)) + '</button>';
    }).join('');

    return head('ob.s3.title', 'ob.s3.subtitle') +

      '<div class="ob-field">' +
        '<label class="ob-label ob-label-lead">' + esc(t('ob.s3.mediumLabel')) + '</label>' +
        '<div class="ob-medium-grid">' + media + '</div>' +
      '</div>' +

      '<div class="ob-field">' +
        '<label class="ob-label">' + esc(t('ob.s3.dateLabel')) + '</label>' +
        '<div class="ob-chip-row">' + chips + '</div>' +
        '<label class="ob-help" for="obDate">' + esc(t('ob.s3.customDate')) + '</label>' +
        '<input type="date" id="obDate" class="ob-input" min="' + todayIso() + '" ' +
          'value="' + esc(d.targetDate || '') + '" onchange="Onboarding.setDate(this.value)">' +
        '<p class="ob-help">' + esc(t('ob.s3.dateHelp')) + '</p>' +
      '</div>';
  };

  /* --- Step 4: hours, pomodoros, target score --- */

  Onboarding.renderStep4 = function () {
    var d = Onboarding.draft;
    var ex = Onboarding.selectedExam();
    var total = (ex && ex.totalMarks) || 100;
    var passing = (ex && ex.passingMarks) || Math.round(total * 0.4);
    var topScore = Math.round(total * 0.8);

    var hours = HOUR_OPTIONS.map(function (h) {
      return '<button class="ob-card ' + (d.dailyHours === h.v ? 'selected' : '') + '" ' +
        'onclick="Onboarding.setHours(' + h.v + ')">' +
        '<span class="ob-card-big">' + h.v + (h.v >= 6 ? '+' : '') + '</span>' +
        '<span class="ob-card-title">' + esc(t('goal.hoursUnit')) + '</span>' +
        '<span class="ob-card-desc">' + esc(t(h.key)) + '</span>' +
      '</button>';
    }).join('');

    var kind = d._scoreKind || (d.targetScore && d.targetScore >= topScore ? 'top' : 'pass');
    var scores = '' +
      '<button class="ob-card ' + (kind === 'pass' ? 'selected' : '') + '" onclick="Onboarding.setScore(\'pass\')">' +
        '<span class="ob-card-big">' + passing + '</span>' +
        '<span class="ob-card-title">' + esc(t('ob.s4.scorePass')) + '</span>' +
        '<span class="ob-card-desc">' + esc(t('ob.s4.scorePassDesc')) + '</span>' +
      '</button>' +
      '<button class="ob-card ' + (kind === 'top' ? 'selected' : '') + '" onclick="Onboarding.setScore(\'top\')">' +
        '<span class="ob-card-big">' + topScore + '</span>' +
        '<span class="ob-card-title">' + esc(t('ob.s4.scoreTop')) + '</span>' +
        '<span class="ob-card-desc">' + esc(t('ob.s4.scoreTopDesc')) + '</span>' +
      '</button>';

    return head('ob.s4.title', 'ob.s4.subtitle') +

      '<div class="ob-field">' +
        '<label class="ob-label">' + esc(t('ob.s4.hoursLabel')) + '</label>' +
        '<div class="ob-card-grid three">' + hours + '</div>' +
      '</div>' +

      '<div class="ob-field">' +
        '<label class="ob-label" for="obPomo">' + esc(t('ob.s4.pomoLabel')) + '</label>' +
        '<div class="ob-slider-row">' +
          '<input type="range" id="obPomo" class="ob-slider" min="2" max="8" step="1" ' +
            'value="' + (d.dailyPomodoros || 4) + '" oninput="Onboarding.setPomodoros(this.value)">' +
          '<span class="ob-slider-out"><strong id="obPomoValue">' + (d.dailyPomodoros || 4) + '</strong> ' +
            esc(t('ob.s4.pomoUnit')) + '</span>' +
        '</div>' +
        '<p class="ob-help" id="obPomoHelp">' +
          esc(t('ob.s4.pomoHelp', { mins: (d.dailyPomodoros || 4) * 25 })) + '</p>' +
      '</div>' +

      '<div class="ob-field">' +
        '<label class="ob-label">' + esc(t('ob.s4.scoreLabel')) + '</label>' +
        '<div class="ob-card-grid two">' + scores + '</div>' +
      '</div>';
  };

  /* --- Step 5: strategy preview --- */

  Onboarding.renderStep5 = function () {
    var ex = Onboarding.selectedExam();
    var examName = ex ? I18n.examTitle(ex) : '';
    var plan = State.studyPlan(
      // Use the loaded roadmap only when it matches the chosen exam.
      (State.exam && State.activeExamId === Onboarding.draft.targetExamId) ? State.exam : null
    );

    // studyPlan reads the saved profile; the draft may not be saved yet.
    var days = Onboarding.draft.targetDate
      ? Math.max(1, Math.round(
          (new Date(Onboarding.draft.targetDate + 'T00:00:00') - new Date(new Date().toDateString())) / 86400000
        ))
      : 90;
    var hours = Onboarding.draft.dailyHours || 4;
    var totalHours = days * hours;
    var tight = days < 45;
    var split = tight ? [0.25, 0.55, 0.20] : [0.35, 0.40, 0.25];
    var phaseDays = split.map(function (f) { return Math.max(1, Math.round(days * f)); });
    var weeks = Math.max(1, Math.round(days / 7));
    var topicsPerWeek = plan.totalTopics ? Math.max(1, Math.ceil(plan.totalTopics / weeks)) : 0;

    var stats = '' +
      '<div class="ob-stat"><span class="ob-stat-num">' + days + '</span>' +
        '<span class="ob-stat-label">' + esc(t('ob.s5.daysAvailable')) + '</span></div>' +
      '<div class="ob-stat"><span class="ob-stat-num">' + totalHours + '</span>' +
        '<span class="ob-stat-label">' + esc(t('ob.s5.totalHours')) + '</span></div>' +
      (topicsPerWeek
        ? '<div class="ob-stat"><span class="ob-stat-num">' + topicsPerWeek + '</span>' +
          '<span class="ob-stat-label">' + esc(t('ob.s5.topicsPerWeek')) + '</span></div>'
        : '');

    var phases = [
      { key: 'ob.s5.phase1', desc: 'ob.s5.phase1Desc', days: phaseDays[0], cls: 'p1' },
      { key: 'ob.s5.phase2', desc: 'ob.s5.phase2Desc', days: phaseDays[1], cls: 'p2' },
      { key: 'ob.s5.phase3', desc: 'ob.s5.phase3Desc', days: phaseDays[2], cls: 'p3' }
    ].map(function (p, i) {
      var pct = Math.round((p.days / days) * 100);
      return '<div class="ob-phase ' + p.cls + '">' +
        '<span class="ob-phase-num">' + (i + 1) + '</span>' +
        '<div class="ob-phase-body">' +
          '<div class="ob-phase-top">' +
            '<span class="ob-phase-name">' + esc(t(p.key)) + '</span>' +
            '<span class="ob-phase-days">' + esc(t('ob.s5.days', { n: p.days })) + '</span>' +
          '</div>' +
          '<p class="ob-phase-desc">' + esc(t(p.desc)) + '</p>' +
          '<div class="ob-phase-bar"><div class="ob-phase-bar-fill" style="width:' + pct + '%"></div></div>' +
        '</div>' +
      '</div>';
    }).join('');

    return head('ob.s5.title', 'ob.s5.subtitle', { exam: examName }) +
      '<div class="ob-stat-row">' + stats + '</div>' +
      '<div class="ob-phase-list">' + phases + '</div>' +
      '<div class="ob-note ' + (tight ? 'warn' : 'good') + '">' +
        esc(t(tight ? 'ob.s5.tightWarning' : 'ob.s5.comfortable')) + '</div>';
  };

  /* --- Step 6: feature tour --- */

  Onboarding.renderStep6 = function () {
    var cards = FEATURES.map(function (f, i) {
      return '<div class="ob-feature" style="--accent:' + f.accent + '; animation-delay:' + (i * 90) + 'ms">' +
        '<span class="ob-feature-icon">' + f.icon + '</span>' +
        '<div>' +
          '<h4 class="ob-feature-title">' + esc(t(f.titleKey)) + '</h4>' +
          '<p class="ob-feature-desc">' + esc(t(f.descKey)) + '</p>' +
        '</div>' +
      '</div>';
    }).join('');

    return head('ob.s6.title', 'ob.s6.subtitle') +
      '<div class="ob-feature-list">' + cards + '</div>';
  };

  /* --- Step 7: launch --- */

  Onboarding.renderStep7 = function () {
    var d = Onboarding.draft;
    var ex = Onboarding.selectedExam();
    var examName = ex ? I18n.examTitle(ex) : '';
    var name = (d.name || '').trim();

    var title = name ? t('ob.s7.title', { name: esc(name) }) : t('ob.s7.titleAnon');

    var rows = '' +
      '<div class="ob-summary-row"><span>' + esc(t('ob.s7.summaryExam')) + '</span>' +
        '<strong>' + esc(examName) + '</strong></div>' +
      '<div class="ob-summary-row"><span>' + esc(t('ob.s7.summaryMedium')) + '</span>' +
        '<strong>' + esc(t('medium.' + d.examMedium)) + '</strong></div>' +
      '<div class="ob-summary-row"><span>' + esc(t('ob.s7.summaryDate')) + '</span>' +
        '<strong>' + esc(d.targetDate ? I18n.formatDate(d.targetDate) : t('goal.noDate')) + '</strong></div>' +
      '<div class="ob-summary-row"><span>' + esc(t('ob.s7.summaryHours')) + '</span>' +
        '<strong>' + d.dailyHours + ' ' + esc(t('goal.hoursUnit')) + ' · ' +
        d.dailyPomodoros + ' 🍅</strong></div>';

    return '' +
      '<div class="ob-hero">🚀</div>' +
      '<div class="ob-head">' +
        '<h2 class="ob-title">' + title + '</h2>' +
        '<p class="ob-sub">' + esc(t('ob.s7.subtitle', { exam: examName })) + '</p>' +
      '</div>' +

      '<div class="ob-summary">' + rows + '</div>' +

      '<div class="ob-launch-row">' +
        (State.authToken ?
        '<button class="ob-launch primary" onclick="Onboarding.finish(false)">' +
          '<span class="ob-launch-title">' + esc(t('ob.s7.start')) + '</span>' +
          '<span class="ob-launch-desc">' + esc(t('ob.s7.startDesc')) + '</span>' +
        '</button>' :
        '<button class="ob-launch primary" onclick="Onboarding.finish(true)">' +
          '<span class="ob-launch-title">' + esc(t('ob.s7.cloud')) + '</span>' +
          '<span class="ob-launch-desc">' + esc(t('ob.s7.cloudDesc')) + '</span>' +
        '</button>') +
      '</div>' +
      (State.authToken ? '' :
      '<button class="ob-preview-link" onclick="Onboarding.finish(false)">' + esc(t('ob.s7.preview')) + '</button>') +
      '';
  };

  global.Onboarding = Onboarding;
})(window);
