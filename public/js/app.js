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

  /* ---------------- language ---------------- */

  /**
   * Re-paint every surface that holds translated text. The roadmap and drawer
   * build their markup as strings, so a language change means re-rendering
   * rather than swapping text nodes in place.
   */
  function applyLanguageToUI() {
    I18n.applyStatic(document);
    updateThemeUI();
    updateSyncUI();
    updateLangUI();

    if (global.Roadmap && State.exam) {
      Roadmap.renderExamHeader();
      Roadmap.render();
    }
    if (global.Timer) Timer.updateDisplay();
    if (global.GoalBanner) GoalBanner.render();
    if (global.StudyDrawer && StudyDrawer.currentTopicId) StudyDrawer.render();
    if (global.Catalog && State.catalog) {
      var cm = document.getElementById('catalogModal');
      if (cm && cm.classList.contains('open')) Catalog.render();
    }
  }

  function updateLangUI() {
    var btn = document.getElementById('langToggleText');
    if (btn) {
      // Show the language the click will switch *to*, not the current one.
      var next = I18n.lang === 'en' ? 'hi' : 'en';
      var meta = I18n.LANGS.filter(function (l) { return l.code === next; })[0];
      btn.innerText = meta ? meta.native : next.toUpperCase();
    }
    document.querySelectorAll('[data-lang-opt]').forEach(function (el) {
      el.classList.toggle('active', el.getAttribute('data-lang-opt') === I18n.lang);
    });
  }
  global.updateLangUI = updateLangUI;

  global.setAppLanguage = function (code) {
    if (!I18n.setLang(code)) return;
    // Remember the choice on the profile too, so it survives a cloud restore.
    if (State.getProfile()) State.saveProfile({ appLanguage: code });
  };

  global.toggleAppLanguage = function () {
    setAppLanguage(I18n.lang === 'en' ? 'hi' : 'en');
  };

  global.openGoalGuide = function () {
    if (global.Onboarding) Onboarding.open(true);
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
    showToast(I18n.t(next === 'light' ? 'app.toastLight' : 'app.toastDark'), 'info');
  };

  function updateThemeUI(theme) {
    var t = theme || getCurrentTheme();
    var icon = document.getElementById('themeToggleIcon');
    var txt = document.getElementById('themeToggleText');
    if (icon) icon.innerText = t === 'light' ? '🌙' : '☀️';
    if (txt) txt.innerText = I18n.t(t === 'light' ? 'app.themeDark' : 'app.themeLight');
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
      text.innerText = I18n.t('sync.local');
      if (authBtn) { authBtn.style.display = ''; authBtn.innerText = I18n.t('sync.login'); }
      if (syncBtn) syncBtn.style.display = 'none';
      if (chip) { chip.style.display = 'none'; chip.innerHTML = ''; }
      return;
    }

    if (State.isSyncing) {
      badge.className = 'sync-badge syncing';
      text.innerText = I18n.t('sync.syncing');
    } else {
      badge.className = 'sync-badge synced';
      text.innerText = I18n.t(State.lastSyncedAt ? 'sync.synced' : 'sync.connected');
    }

    if (authBtn) authBtn.style.display = 'none';
    if (syncBtn) syncBtn.style.display = '';
    if (chip) {
      chip.style.display = '';
      var u = State.currentUser || {};
      var name = u.name || u.email || u.username || I18n.t('auth.student');
      // Google gives us a profile picture; email sign-ups fall back to an emoji.
      var badge = u.avatarUrl
        ? '<img class="user-chip-avatar" src="' + Roadmap.esc(u.avatarUrl) + '" alt="">'
        : '👤';
      chip.innerHTML = '<span class="user-chip" title="' + Roadmap.esc(u.email || name) + '">' +
        badge + ' ' + Roadmap.esc(name) +
        ' <button class="logout-btn" onclick="handleLogout()" title="' + Roadmap.esc(I18n.t('auth.logout')) + '">⏻</button></span>';
    }
  }
  global.updateSyncUI = updateSyncUI;

  /* ---------------- auth modal ---------------- */

  global.openAuthModal = function () {
    var m = document.getElementById('authModal');
    if (!m) return;
    m.classList.add('open');
    // Tell the student up-front if cloud sync cannot work, rather than letting
    // them fill in the form and hit a wall on submit.
    if (State.cloudReady && !State.cloudReady()) guardCloud();
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

  /**
   * Runs after a session exists. State.initSupabaseAuth's listener has already
   * stored the identity and kicked off the progress pull, so this only closes
   * the modal and greets the student.
   */
  function afterAuth(user) {
    closeAuthModal();
    var name = (user && (user.name || user.email)) || I18n.t('auth.student');
    showToast(I18n.t('auth.welcome', { name: name }));
    updateSyncUI();
  }

  /** Cloud unavailable (no keys, or CDN blocked): explain, do not fail silently. */
  function guardCloud() {
    if (State.cloudReady && State.cloudReady()) return true;
    var msg = (global.SupabaseAuth && SupabaseAuth.unavailableMessage()) ||
      I18n.t('auth.notConfigured');
    showAuthAlert(msg, true);
    return false;
  }

  global.handleGoogleLogin = async function () {
    if (!guardCloud()) return;
    var btn = document.getElementById('googleLoginBtn');
    if (btn) { btn.disabled = true; btn.classList.add('is-loading'); }
    showAuthAlert(I18n.t('auth.redirecting'), false);
    try {
      var res = await SupabaseAuth.signInWithGoogle();
      // On success the browser navigates away, so only failures land here.
      if (!res.ok) showAuthAlert(res.error || I18n.t('auth.loginFailed'), true);
    } catch (e) {
      showAuthAlert(e.message, true);
    } finally {
      if (btn) { btn.disabled = false; btn.classList.remove('is-loading'); }
    }
  };

  global.submitLoginForm = async function (ev) {
    ev.preventDefault();
    if (!guardCloud()) return;

    var btn = document.getElementById('loginSubmitBtn');
    var email = document.getElementById('loginEmail').value.trim();
    var pass = document.getElementById('loginPassword').value;
    if (btn) { btn.disabled = true; btn.innerText = I18n.t('auth.loggingIn'); }
    try {
      var res = await SupabaseAuth.signInWithEmail(email, pass);
      if (!res.ok) throw new Error(res.error || I18n.t('auth.loginFailed'));
      afterAuth(res.user);
    } catch (e) {
      showAuthAlert(e.message, true);
    } finally {
      if (btn) { btn.disabled = false; btn.innerText = I18n.t('auth.doLogin'); }
    }
  };

  global.submitRegisterForm = async function (ev) {
    ev.preventDefault();
    if (!guardCloud()) return;

    var btn = document.getElementById('regSubmitBtn');
    var name = document.getElementById('regName').value.trim();
    var email = document.getElementById('regEmail').value.trim();
    var pass = document.getElementById('regPassword').value;
    if (btn) { btn.disabled = true; btn.innerText = I18n.t('auth.creating'); }
    try {
      var res = await SupabaseAuth.signUpWithEmail(email, pass, name);
      if (!res.ok) throw new Error(res.error || I18n.t('auth.registerFailed'));

      // With "Confirm email" enabled there is no session yet — the student must
      // click the link first, so keep the modal open with the instruction.
      if (res.needsConfirmation) {
        showAuthAlert(I18n.t('auth.confirmEmail', { email: email }), false);
        return;
      }
      // Carry the name they just typed into the local profile too.
      if (name && State.getProfile && State.getProfile()) {
        State.saveProfile({ name: name });
      }
      afterAuth(res.user);
    } catch (e) {
      showAuthAlert(e.message, true);
    } finally {
      if (btn) { btn.disabled = false; btn.innerText = I18n.t('auth.doRegister'); }
    }
  };

  global.handleForgotPassword = async function () {
    if (!guardCloud()) return;

    var field = document.getElementById('loginEmail');
    var email = (field && field.value.trim()) || '';
    if (!email) {
      showAuthAlert(I18n.t('auth.enterEmailFirst'), true);
      if (field) field.focus();
      return;
    }
    var link = document.getElementById('forgotPasswordLink');
    if (link) link.setAttribute('aria-disabled', 'true');
    try {
      var res = await SupabaseAuth.sendPasswordReset(email);
      if (!res.ok) throw new Error(res.error || I18n.t('auth.resetFailed'));
      showAuthAlert(I18n.t('auth.resetSent'), false);
    } catch (e) {
      showAuthAlert(e.message, true);
    } finally {
      if (link) link.removeAttribute('aria-disabled');
    }
  };

  global.handleLogout = async function () {
    await State.signOut();
    updateSyncUI();
    showToast(I18n.t('auth.loggedOut'), 'info');
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
    showToast(I18n.t('io.exported'));
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
        if (!incoming || typeof incoming !== 'object') throw new Error(I18n.t('io.invalidFile'));

        if (data.examId && data.examId !== State.activeExamId) {
          var ok = confirm(I18n.t('io.mismatch', { title: data.examTitle || data.examId }));
          if (!ok) { ev.target.value = ''; return; }
        }

        State.userState = State.mergeProgress(State.userState, incoming);
        State.saveProgress();
        Roadmap.render();
        showToast(I18n.t('io.imported'));
      } catch (err) {
        showToast(I18n.t('io.importFailed', { msg: err.message }), 'error');
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
    showToast(I18n.t('reset.done'), 'info');
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
      showToast(I18n.t('app.installHint'), 'info');
      return;
    }
    deferredPrompt.prompt();
    var choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') showToast(I18n.t('app.installed'));
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
    showToast(I18n.t('app.backOnline'), 'info');
    if (State.authToken) State.pushCloudProgress(false);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(function (reg) {
        if (reg) reg.update().catch(function () {});
      });
    }
    if (State.checkForRoadmapUpdate) State.checkForRoadmapUpdate();
  });
  global.addEventListener('offline', function () {
    updateOnlineUI();
    showToast(I18n.t('app.wentOffline'), 'info');
  });

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then(function (reg) {
          if (reg) reg.update().catch(function () {});
        });
      }
      if (State.checkForRoadmapUpdate) State.checkForRoadmapUpdate();
    }
  });

  /* ---------------- bootstrap ---------------- */

  async function boot() {
    // Language must settle before any translated markup is produced.
    I18n.load();
    document.documentElement.setAttribute('lang', I18n.lang);
    I18n.applyStatic(document);
    I18n.onChange(applyLanguageToUI);

    State.loadProfile();
    // A profile saved on another device carries the student's chosen language.
    var prof = State.getProfile();
    if (prof && prof.appLanguage && prof.appLanguage !== I18n.lang) {
      I18n.setLang(prof.appLanguage, true);
      document.documentElement.setAttribute('lang', I18n.lang);
      I18n.applyStatic(document);
    }

    applyTheme(localStorage.getItem(THEME_KEY) || 'dark');
    updateOnlineUI();
    updateLangUI();
    State.loadAuth();
    updateSyncUI();

    // Keep the UI in step with the state manager.
    State.on('progress:changed', function () { Roadmap.updateAll(); });
    State.on('profile:changed', function () {
      if (global.GoalBanner) GoalBanner.render();
      if (State.exam) Roadmap.renderExamHeader();
    });
    State.on('progress:replaced', function () { Roadmap.render(); });
    State.on('sync:changed', updateSyncUI);
    State.on('auth:changed', updateSyncUI);
    State.on('sync:success', function () { showToast(I18n.t('sync.pushed')); });
    State.on('sync:pulled', function () { showToast(I18n.t('sync.pulled')); });
    State.on('sync:expired', function () { showToast(I18n.t('sync.expired'), 'error'); });
    // A Google redirect lands on a *fresh* page load, so no submit handler is
    // around to greet the student — the auth listener has to do it. Restoring
    // an existing session on an ordinary reload must stay silent, and Supabase
    // marks that case by leaving the OAuth fragment out of the URL.
    var returningFromOAuth = /[#?&](access_token|code|error)=/.test(
      global.location.hash + global.location.search
    );
    State.on('auth:signedIn', function (user) {
      var m = document.getElementById('authModal');
      if ((m && m.classList.contains('open')) || returningFromOAuth) {
        returningFromOAuth = false;
        afterAuth(user);
      }
    });
    State.on('exam:changed', function () {
      Roadmap.renderExamHeader();
      Roadmap.render();
      Timer.clearFocus();
    });
    State.on('exam:updated', function () {
      Roadmap.renderExamHeader();
      Roadmap.render();
      showToast(I18n.lang === 'hi' ? '✨ पाठ्यक्रम रोडमैप अपडेट हो गया है!' : '✨ Syllabus roadmap updated to latest version!', 'info');
    });

    // Let a deployment's env vars override the bundled credentials. This must
    // finish before the client is first constructed; offline it is a no-op.
    if (global.SupabaseConfig && SupabaseConfig.refreshFromServer) {
      await SupabaseConfig.refreshFromServer();
    }

    // Supabase owns the session from here: this attaches the listener that
    // restores it, completes any OAuth redirect and refreshes tokens silently.
    // It runs after the listeners above so the first SIGNED_IN is not missed.
    State.initSupabaseAuth();

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
          showToast(I18n.t('app.roadmapLoadFailed'), 'error');
        }
      } else {
        showToast(I18n.t('app.roadmapLoadFailed'), 'error');
      }
    }

    Timer.updateDisplay();
    if (global.GoalBanner) GoalBanner.init();
    if (global.Onboarding) Onboarding.init();

    // Register the service worker for offline study with auto-update monitoring.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(function (reg) {
        reg.update().catch(function () {});
        reg.addEventListener('updatefound', function () {
          var newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', function () {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                newWorker.postMessage({ type: 'SKIP_WAITING' });
              }
            });
          }
        });
      }).catch(function (err) {
        console.warn('Service worker registration failed:', err.message);
      });

      navigator.serviceWorker.addEventListener('message', function (event) {
        if (event.data && event.data.type === 'ROADMAP_UPDATED') {
          if (State.checkForRoadmapUpdate) State.checkForRoadmapUpdate();
        }
      });
    }

    // Close overlays with Escape.
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      // The onboarding modal deliberately ignores Escape: leaving setup
      // half-done is a choice, made via its own "Skip for now" control.
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
