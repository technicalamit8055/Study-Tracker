/**
 * ExamRoadmap - Dashboard Goal Banner
 *
 * The persistent reminder of what the student signed up for: their name, the
 * target exam and its medium, the countdown, and today's study target measured
 * against the Pomodoro sessions they have actually completed.
 *
 * Renders nothing until onboarding has produced a profile, so a brand-new
 * visitor is not shown an empty scoreboard.
 */
(function (global) {
  'use strict';

  var GoalBanner = {};

  function esc(s) { return Roadmap.esc(s); }
  function t(k, v) { return I18n.t(k, v); }

  /** Countdown copy varies by sign, so keep the wording in one place. */
  function countdown(days) {
    if (days == null) return { value: '—', label: t('goal.noDate'), tone: 'none' };
    if (days === 0) return { value: '0', label: t('goal.examToday'), tone: 'urgent' };
    if (days < 0) return { value: '—', label: t('goal.examPassed'), tone: 'past' };
    return {
      value: String(days),
      label: t('goal.daysLeft'),
      tone: days <= 30 ? 'urgent' : (days <= 60 ? 'soon' : 'ok')
    };
  }

  GoalBanner.render = function () {
    var host = document.getElementById('goalBanner');
    if (!host) return;

    var p = State.getProfile();
    if (!p || !p.onboardingDone) {
      host.innerHTML = '';
      host.style.display = 'none';
      return;
    }
    host.style.display = '';

    var days = State.daysUntilExam();
    var cd = countdown(days);
    var name = (p.name || '').trim();
    var examTitle = State.exam
      ? I18n.pick(State.exam, 'title', 'titleEn')
      : (p.targetExamId || '');

    var doneToday = (global.Timer && Timer.sessionsToday) ? Timer.sessionsToday() : 0;
    var goalPomos = p.dailyPomodoros || 4;
    var pomoPct = goalPomos ? Math.min(100, Math.round((doneToday / goalPomos) * 100)) : 0;

    host.innerHTML = '' +
      '<div class="goal-banner-inner">' +

        '<div class="gb-identity">' +
          '<div class="gb-greeting">' +
            esc(name ? t('goal.greeting', { name: name }) : t('goal.greetingAnon')) +
          '</div>' +
          '<div class="gb-exam" title="' + esc(examTitle) + '">' + esc(examTitle) + '</div>' +
          '<div class="gb-badges">' +
            '<span class="gb-badge medium">🗣 ' + esc(t('medium.' + p.examMedium)) + '</span>' +
            (p.targetScore
              ? '<span class="gb-badge score">🎯 ' + esc(t('goal.targetScore')) + ': ' + p.targetScore + '</span>'
              : '') +
          '</div>' +
        '</div>' +

        '<div class="gb-metrics">' +
          '<div class="gb-metric countdown ' + cd.tone + '">' +
            '<span class="gb-metric-num">' + esc(cd.value) + '</span>' +
            '<span class="gb-metric-label">' + esc(cd.label) + '</span>' +
          '</div>' +

          '<div class="gb-metric">' +
            '<span class="gb-metric-num">' + (p.dailyHours || 0) +
              '<small>' + esc(t('goal.hoursUnit')) + '</small></span>' +
            '<span class="gb-metric-label">' + esc(t('goal.dailyTarget')) + '</span>' +
          '</div>' +

          '<div class="gb-metric pomo">' +
            '<span class="gb-metric-num">' + doneToday + '<small>/' + goalPomos + '</small></span>' +
            '<span class="gb-metric-label">' + esc(t('goal.pomodoros')) + '</span>' +
            '<div class="gb-pomo-bar"><div class="gb-pomo-fill" style="width:' + pomoPct + '%"></div></div>' +
          '</div>' +
        '</div>' +

        '<button class="gb-edit" onclick="Onboarding.open(true)" title="' + esc(t('goal.buttonTitle')) + '">' +
          '⚙ ' + esc(t('goal.edit')) +
        '</button>' +

      '</div>';
  };

  GoalBanner.init = function () {
    GoalBanner.render();
    State.on('profile:changed', GoalBanner.render);
    State.on('exam:changed', GoalBanner.render);
    I18n.onChange(GoalBanner.render);
  };

  global.GoalBanner = GoalBanner;
})(window);
