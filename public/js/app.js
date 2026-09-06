/**
 * ExamRoadmap - App shell
 * Theme, toasts, auth modal, import/export, PWA install and bootstrap.
 */
(function (global) {
  'use strict';

  /* ---------------- toasts ---------------- */

  global.showToast = function (message, type) {
    var box = document.getElementById('toastContainer');
    if (!box) return;
    var el = document.createElement('div');
    el.className = 'toast ' + (type || 'success');
    el.innerText = message;
    box.appendChild(el);
    setTimeout(function () { el.classList.add('hide'); }, 3200);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 3700);
  };

  /* ---------------- theme ---------------- */

  var THEME_KEY = 'stet_theme';

  global.getCurrentTheme = function () {
    return document.documentElement.getAttribute('data-theme') ||
      localStorage.getItem(THEME_KEY) || 'dark';
  };

  global.applyTheme = function (theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
    updateThemeUI(theme);
  };

  global.toggleTheme = function () {
    var next = getCurrentTheme() === 'light' ? 'dark' : 'light';
    applyTheme(next);
    showToast(next === 'light' ? '☀️ लाइट मोड' : '🌙 डार्क मोड', 'info');
  };

  function updateThemeUI(theme) {
    var t = theme || getCurrentTheme();
    var icon = document.getElementById('themeToggleIcon');
    var txt = document.getElementById('themeToggleText');
    if (icon) icon.innerText = t === 'light' ? '🌙' : '☀️';
    if (txt) txt.innerText = t === 'light' ? 'डार्क' : 'लाइट';
  }
  global.updateThemeUI = updateThemeUI;

  /* ---------------- sync UI ---------------- */

  function updateSyncUI() {
    var badge = document.getElementById('syncStatusBadge');
    var text = document.getElementById('syncStatusText');
    var authBtn = document.getElementById('authActionBtn');
    var syncBtn = document.getElementById('manualSyncBtn');
    var chip = document.getElementById('userChipContainer');
    if (!badge || !text) return;

    if (!State.authToken) {
      badge.className = 'sync-badge local';
      text.innerText = 'लोकल मोड';
      if (authBtn) { authBtn.style.display = ''; authBtn.innerText = '☁ लॉगिन / सिंक'; }
      if (syncBtn) syncBtn.style.display = 'none';
      if (chip) { chip.style.display = 'none'; chip.innerHTML = ''; }
      return;
    }

    if (State.isSyncing) {
      badge.className = 'sync-badge syncing';
      text.innerText = 'सिंक हो रहा है…';
    } else {
      badge.className = 'sync-badge synced';
      text.innerText = State.lastSyncedAt ? 'क्लाउड सिंक ✓' : 'क्लाउड जुड़ा';
    }

    if (authBtn) authBtn.style.display = 'none';
    if (syncBtn) syncBtn.style.display = '';
    if (chip) {
      chip.style.display = '';
      var name = (State.currentUser && (State.currentUser.name || State.currentUser.username)) || 'छात्र';
      chip.innerHTML = '<span class="user-chip">👤 ' + Roadmap.esc(name) +
        ' <button class="logout-btn" onclick="handleLogout()" title="लॉगआउट">⏻</button></span>';
    }
  }
  global.updateSyncUI = updateSyncUI;

  /* ---------------- auth modal ---------------- */

  global.openAuthModal = function () {
    var m = document.getElementById('authModal');
    if (m) m.classList.add('open');
  };

  global.closeAuthModal = function () {
    var m = document.getElementById('authModal');
    if (m) m.classList.remove('open');
    showAuthAlert('', false, true);
  };

  global.switchAuthTab = function (tab) {
    var login = document.getElementById('loginForm');
    var reg = document.getElementById('registerForm');
    var lb = document.getElementById('tabLoginBtn');
    var rb = document.getElementById('tabRegisterBtn');
    var isLogin = tab === 'login';
    if (login) login.style.display = isLogin ? '' : 'none';
    if (reg) reg.style.display = isLogin ? 'none' : '';
    if (lb) lb.className = 'auth-tab-btn' + (isLogin ? ' active' : '');
    if (rb) rb.className = 'auth-tab-btn' + (isLogin ? '' : ' active');
    showAuthAlert('', false, true);
  };

  function showAuthAlert(msg, isError, hide) {
    var el = document.getElementById('authAlert');
    if (!el) return;
    if (hide || !msg) { el.style.display = 'none'; el.innerText = ''; return; }
    el.style.display = 'block';
    el.className = 'auth-alert ' + (isError ? 'error' : 'success');
    el.innerText = msg;
  }

  async function afterAuth(data) {
    State.setAuth(data.token, data.user);
    closeAuthModal();
    showToast('✓ स्वागत है, ' + ((data.user && (data.user.name || data.user.username)) || 'छात्र') + '!');
    updateSyncUI();
    await State.fetchCloudProgress(State.activeExamId);
  }

  global.submitLoginForm = async function (ev) {
    ev.preventDefault();
    var btn = document.getElementById('loginSubmitBtn');
    var u = document.getElementById('loginUsername').value.trim();
    var p = document.getElementById('loginPassword').value;
    if (btn) { btn.disabled = true; btn.innerText = 'लॉगिन हो रहा है…'; }
    try {
      var res = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, password: p })
      });
      var data = await res.json();
      if (!res.ok) throw new Error(data.error || 'लॉगिन विफल');
      await afterAuth(data);
    } catch (e) {
      showAuthAlert(e.message, true);
    } finally {
      if (btn) { btn.disabled = false; btn.innerText = '✓ लॉगिन करें'; }
    }
  };

  global.submitRegisterForm = async function (ev) {
    ev.preventDefault();
    var btn = document.getElementById('regSubmitBtn');
    var name = document.getElementById('regName').value.trim();
    var u = document.getElementById('regUsername').value.trim();
    var p = document.getElementById('regPassword').value;
    if (btn) { btn.disabled = true; btn.innerText = 'खाता बन रहा है…'; }
    try {
      var res = await fetch('/api/auth/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, username: u, password: p })
      });
      var data = await res.json();
      if (!res.ok) throw new Error(data.error || 'रजिस्ट्रेशन विफल');
      await afterAuth(data);
    } catch (e) {
      showAuthAlert(e.message, true);
    } finally {
      if (btn) { btn.disabled = false; btn.innerText = '✓ खाता बनाएं'; }
    }
  };

  global.handleLogout = function () {
    State.clearAuth();
    updateSyncUI();
    showToast('आप लॉगआउट हो गए। प्रगति इस डिवाइस पर सुरक्षित है।', 'info');
  };

  global.triggerManualSync = async function () {
    if (!State.authToken) return openAuthModal();
    await State.pushCloudProgress(true);
  };

  /* ---------------- import / export / reset ---------------- */

  global.exportProgressJSON = function () {
    var payload = {
      app: 'ExamRoadmap',
      version: 2,
      examId: State.activeExamId,
      examTitle: State.exam ? State.exam.title : '',
      exportedAt: new Date().toISOString(),
      stats: State.summaryForCloud(),
      userState: State.userState
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'examroadmap-' + State.activeExamId + '-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
    showToast('⬇ प्रगति फाइल डाउनलोड हुई');
  };

  global.triggerImportJSON = function () {
    var el = document.getElementById('importFileInput');
    if (el) el.click();
  };

  global.handleImportFile = function (ev) {
    var file = ev.target.files && ev.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        var data = JSON.parse(e.target.result);
        var incoming = data.userState || data;
        if (!incoming || typeof incoming !== 'object') throw new Error('अमान्य फाइल');

        if (data.examId && data.examId !== State.activeExamId) {
          var ok = confirm(
            'यह फाइल "' + (data.examTitle || data.examId) + '" की है, ' +
            'जबकि वर्तमान रोडमैप अलग है।\n\nफिर भी इसी रोडमैप में इम्पोर्ट करें?'
          );
          if (!ok) { ev.target.value = ''; return; }
        }

        State.userState = State.mergeProgress(State.userState, incoming);
        State.saveProgress();
        Roadmap.render();
        showToast('⬆ प्रगति सफलतापूर्वक इम्पोर्ट हुई');
      } catch (err) {
        showToast('इम्पोर्ट विफल: ' + err.message, 'error');
      }
      ev.target.value = '';
    };
    reader.readAsText(file);
  };

  global.confirmResetAll = function () {
    var m = document.getElementById('resetModal');
    if (m) m.classList.add('open');
  };

  global.closeResetModal = function () {
    var m = document.getElementById('resetModal');
    if (m) m.classList.remove('open');
  };

  global.executeResetAll = function () {
    State.userState = {};
    State.saveProgress();
    Roadmap.render();
    closeResetModal();
    showToast('सभी प्रगति रीसेट कर दी गई', 'info');
  };

  /* ---------------- PWA install ---------------- */

  var deferredPrompt = null;

  global.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    var btn = document.getElementById('installAppBtn');
    if (btn) btn.style.display = '';
  });

  global.installApp = async function () {
    if (!deferredPrompt) {
      showToast('इंस्टॉल करने हेतु ब्राउज़र मेन्यू से "Add to Home Screen" चुनें', 'info');
      return;
    }
    deferredPrompt.prompt();
    var choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') showToast('📲 ऐप इंस्टॉल हो गया!');
    deferredPrompt = null;
    var btn = document.getElementById('installAppBtn');
    if (btn) btn.style.display = 'none';
  };

  global.addEventListener('appinstalled', function () {
    var btn = document.getElementById('installAppBtn');
    if (btn) btn.style.display = 'none';
  });

  /* ---------------- online / offline ---------------- */

  function updateOnlineUI() {
    var el = document.getElementById('offlineBanner');
    if (el) el.style.display = navigator.onLine ? 'none' : 'block';
  }
  global.addEventListener('online', function () {
    updateOnlineUI();
    showToast('🌐 फिर से ऑनलाइन — सिंक हो रहा है', 'info');
    if (State.authToken) State.pushCloudProgress(false);
  });
  global.addEventListener('offline', function () {
    updateOnlineUI();
    showToast('📴 ऑफलाइन मोड — प्रगति इस डिवाइस पर सेव होती रहेगी', 'info');
  });

  /* ---------------- bootstrap ---------------- */

  async function boot() {
    applyTheme(localStorage.getItem(THEME_KEY) || 'dark');
    updateOnlineUI();
    State.loadAuth();
    updateSyncUI();

    // Keep the UI in step with the state manager.
    State.on('progress:changed', function () { Roadmap.updateAll(); });
    State.on('progress:replaced', function () { Roadmap.render(); });
    State.on('sync:changed', updateSyncUI);
    State.on('auth:changed', updateSyncUI);
    State.on('sync:success', function () { showToast('✓ प्रगति क्लाउड पर सिंक हुई'); });
    State.on('sync:pulled', function () { showToast('✓ क्लाउड से नवीनतम प्रगति लोड हुई'); });
    State.on('sync:expired', function () { showToast('सत्र समाप्त — कृपया पुनः लॉगिन करें', 'error'); });
    State.on('exam:changed', function () {
      Roadmap.renderExamHeader();
      Roadmap.render();
      Timer.clearFocus();
    });

    try {
      await State.fetchCatalog();
    } catch (e) {
      console.warn('Catalog unavailable:', e.message);
    }

    var examId = State.getSavedActiveExamId();
    try {
      await State.activateExam(examId);
    } catch (e) {
      // A saved exam that no longer exists should not brick the app.
      if (examId !== State.LEGACY_EXAM_ID) {
        try {
          await State.activateExam(State.LEGACY_EXAM_ID);
        } catch (e2) {
          showToast('रोडमैप लोड नहीं हो सका। कृपया इंटरनेट जांचें।', 'error');
        }
      } else {
        showToast('रोडमैप लोड नहीं हो सका। कृपया इंटरनेट जांचें।', 'error');
      }
    }

    Timer.updateDisplay();
    if (State.authToken) State.verifyAuth();

    // Register the service worker for offline study.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(function (err) {
        console.warn('Service worker registration failed:', err.message);
      });
    }

    // Close overlays with Escape.
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      StudyDrawer.close();
      Catalog.close();
      closeAuthModal();
      closeResetModal();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window);
