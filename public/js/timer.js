/**
 * ExamRoadmap - Pomodoro / Focus Timer
 * Countdown or stopwatch, optionally bound to the topic being studied.
 */
(function (global) {
  'use strict';

  var Timer = {
    seconds: 25 * 60,
    running: false,
    isStopwatch: false,
    focusTopic: null,
    _interval: null,
    _sessionsToday: 0
  };

  var SESSION_KEY = 'examroadmap_sessions';

  function loadSessions() {
    try {
      var raw = JSON.parse(localStorage.getItem(SESSION_KEY) || '{}');
      var today = new Date().toDateString();
      Timer._sessionsToday = raw.date === today ? (raw.count || 0) : 0;
    } catch (e) { Timer._sessionsToday = 0; }
  }

  function saveSessions() {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({
        date: new Date().toDateString(), count: Timer._sessionsToday
      }));
    } catch (e) {}
  }

  Timer.setFocusTopic = function (text) {
    Timer.focusTopic = text;
    Timer.updateDisplay();
  };

  Timer.updateDisplay = function () {
    var clock = document.getElementById('timerClock');
    if (clock) {
      var m = Math.floor(Timer.seconds / 60);
      var s = Timer.seconds % 60;
      clock.innerText = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    }

    var mode = document.getElementById('timerMode');
    if (mode) {
      mode.innerText = Timer.focusTopic
        ? '🎯 ' + Timer.focusTopic
        : I18n.t(Timer.isStopwatch ? 'timer.stopwatch' : 'timer.focus');
    }

    var btn = document.getElementById('timerStartBtn');
    if (btn) btn.innerText = I18n.t(Timer.running ? 'timer.pause' : 'timer.start');

    var sess = document.getElementById('timerSessions');
    if (sess) sess.innerText = I18n.t('timer.today', { n: Timer._sessionsToday });
  };

  Timer.tick = function () {
    if (Timer.isStopwatch) {
      Timer.seconds++;
    } else {
      Timer.seconds--;
      if (Timer.seconds <= 0) {
        Timer.seconds = 0;
        Timer.stop();
        Timer._sessionsToday++;
        saveSessions();
        if (global.GoalBanner) GoalBanner.render();
        Timer.notifyDone();
        Timer.updateDisplay();
        return;
      }
    }
    Timer.updateDisplay();
  };

  Timer.notifyDone = function () {
    if (global.showToast) {
      showToast(I18n.t('timer.done'), 'success');
    }
    try {
      // Short beep so the student notices without needing the tab in view.
      var ctx = new (global.AudioContext || global.webkitAudioContext)();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
      osc.start(); osc.stop(ctx.currentTime + 0.9);
    } catch (e) {}
  };

  Timer.start = function () {
    if (Timer.running) return;
    Timer.running = true;
    Timer._interval = setInterval(Timer.tick, 1000);
    Timer.updateDisplay();
  };

  Timer.stop = function () {
    Timer.running = false;
    if (Timer._interval) clearInterval(Timer._interval);
    Timer._interval = null;
    Timer.updateDisplay();
  };

  Timer.toggle = function () {
    if (Timer.running) Timer.stop(); else Timer.start();
  };

  Timer.reset = function (mins) {
    Timer.stop();
    if (mins === 0) {
      Timer.isStopwatch = true;
      Timer.seconds = 0;
    } else {
      Timer.isStopwatch = false;
      Timer.seconds = mins * 60;
    }
    Timer.updateDisplay();
  };

  /** Focus sessions finished today — drives the goal banner's Pomodoro ring. */
  Timer.sessionsToday = function () {
    return Timer._sessionsToday;
  };

  Timer.clearFocus = function () {
    Timer.focusTopic = null;
    Timer.updateDisplay();
  };

  Timer.snapshot = function () {
    return { timerSeconds: Timer.seconds, isStopwatch: Timer.isStopwatch };
  };

  Timer.restore = function (t) {
    if (!t) return;
    if (typeof t.timerSeconds === 'number' && !Timer.running) Timer.seconds = t.timerSeconds;
    if (typeof t.isStopwatch === 'boolean') Timer.isStopwatch = t.isStopwatch;
    Timer.updateDisplay();
  };

  loadSessions();
  global.Timer = Timer;

  // Let the state manager persist timer position alongside progress.
  if (global.State) {
    State.timerSnapshot = Timer.snapshot;
    State.restoreTimer = Timer.restore;
  }
})(window);
