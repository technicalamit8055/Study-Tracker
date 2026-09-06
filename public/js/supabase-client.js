/**
 * ExamRoadmap - Supabase auth & cloud-progress client
 *
 * Wraps @supabase/supabase-js (loaded from CDN) behind a small, stable API so
 * the rest of the app never touches the SDK directly. Every helper resolves to
 * `{ ok, error, ... }` rather than throwing, because auth failures here are
 * ordinary user-facing outcomes (wrong password, unverified email) and not bugs.
 *
 * When credentials are missing — or the CDN is unreachable offline — the module
 * still loads and reports `isReady() === false`; callers then show a friendly
 * hint and the app keeps working entirely against localStorage.
 */
(function (global) {
  'use strict';

  var client = null;
  var initError = null;

  function cfg() {
    return global.SupabaseConfig || {};
  }

  function init() {
    if (client || initError) return client;

    var c = cfg();
    if (!c.isConfigured || !c.isConfigured()) {
      initError = 'not-configured';
      return null;
    }
    // The CDN bundle exposes the factory as `window.supabase.createClient`.
    if (!global.supabase || typeof global.supabase.createClient !== 'function') {
      initError = 'sdk-missing';
      return null;
    }

    try {
      client = global.supabase.createClient(c.url, c.anonKey, {
        auth: {
          persistSession: true,      // keep the session across reloads
          autoRefreshToken: true,    // silently renew the access token
          detectSessionInUrl: true   // complete the OAuth redirect on return
        }
      });
    } catch (e) {
      initError = e.message || 'init-failed';
      client = null;
    }
    return client;
  }

  /** Human-readable reason the client is unavailable, or null when it is fine. */
  function unavailableReason() {
    init();
    if (client) return null;
    return initError || 'unknown';
  }

  function offlineHint() {
    init();
    if (initError === 'not-configured') {
      return (global.I18n && I18n.t('auth.notConfigured')) ||
        'Cloud sync is not configured yet — your progress is saved on this device.';
    }
    return (global.I18n && I18n.t('auth.sdkOffline')) ||
      'Cloud sign-in is unavailable right now — your progress is saved on this device.';
  }

  function fail() {
    return Promise.resolve({ ok: false, error: offlineHint(), code: 'unavailable' });
  }

  /** Normalise a Supabase user record into the shape State.currentUser expects. */
  function shapeUser(user) {
    if (!user) return null;
    var meta = user.user_metadata || {};
    var name = meta.full_name || meta.name || meta.user_name ||
      (user.email ? user.email.split('@')[0] : '') || '';
    return {
      id: user.id,
      email: user.email || '',
      name: name,
      username: user.email || name,
      avatarUrl: meta.avatar_url || meta.picture || '',
      provider: (user.app_metadata && user.app_metadata.provider) || 'email'
    };
  }

  var SupabaseAuth = {
    shapeUser: shapeUser,

    /** True when a live client exists and auth calls can be attempted. */
    isReady: function () {
      init();
      return !!client;
    },

    unavailableReason: unavailableReason,
    unavailableMessage: offlineHint,

    /** Raw client, for the progress table. Null when unavailable. */
    raw: function () { return init(); },

    /* ---------------- sign in / up ---------------- */

    /**
     * 1-click Google OAuth. Redirects the whole page; the session is picked up
     * on return by `detectSessionInUrl`, so nothing after this call runs.
     */
    signInWithGoogle: async function () {
      if (!SupabaseAuth.isReady()) return fail();
      try {
        var res = await client.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: global.location.origin,
            queryParams: { prompt: 'select_account' }
          }
        });
        if (res.error) return { ok: false, error: res.error.message };
        return { ok: true, redirecting: true };
      } catch (e) {
        return { ok: false, error: e.message || 'Google sign-in failed' };
      }
    },

    signInWithEmail: async function (email, password) {
      if (!SupabaseAuth.isReady()) return fail();
      try {
        var res = await client.auth.signInWithPassword({
          email: (email || '').trim(),
          password: password || ''
        });
        if (res.error) return { ok: false, error: res.error.message };
        return { ok: true, user: shapeUser(res.data.user), session: res.data.session };
      } catch (e) {
        return { ok: false, error: e.message || 'Login failed' };
      }
    },

    /**
     * Register with email + password, storing the display name in user metadata.
     * When the project requires email confirmation, `session` comes back null —
     * that is a success with `needsConfirmation: true`, not an error.
     */
    signUpWithEmail: async function (email, password, fullName) {
      if (!SupabaseAuth.isReady()) return fail();
      try {
        var res = await client.auth.signUp({
          email: (email || '').trim(),
          password: password || '',
          options: {
            data: { full_name: (fullName || '').trim() },
            emailRedirectTo: global.location.origin
          }
        });
        if (res.error) return { ok: false, error: res.error.message };
        return {
          ok: true,
          user: shapeUser(res.data.user),
          session: res.data.session,
          needsConfirmation: !res.data.session
        };
      } catch (e) {
        return { ok: false, error: e.message || 'Registration failed' };
      }
    },

    sendPasswordReset: async function (email) {
      if (!SupabaseAuth.isReady()) return fail();
      try {
        var res = await client.auth.resetPasswordForEmail((email || '').trim(), {
          redirectTo: global.location.origin
        });
        if (res.error) return { ok: false, error: res.error.message };
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e.message || 'Could not send reset email' };
      }
    },

    signOut: async function () {
      if (!SupabaseAuth.isReady()) return { ok: true };
      try {
        var res = await client.auth.signOut();
        if (res.error) return { ok: false, error: res.error.message };
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e.message || 'Sign-out failed' };
      }
    },

    /* ---------------- session ---------------- */

    getSession: async function () {
      if (!SupabaseAuth.isReady()) return null;
      try {
        var res = await client.auth.getSession();
        return (res.data && res.data.session) || null;
      } catch (e) {
        return null;
      }
    },

    /**
     * Subscribe to SIGNED_IN / SIGNED_OUT / TOKEN_REFRESHED / USER_UPDATED.
     * The callback receives (event, session, shapedUser). Returns an
     * unsubscribe function, or a no-op when the client is unavailable.
     */
    onAuthStateChange: function (callback) {
      if (!SupabaseAuth.isReady()) return function () {};
      var sub = client.auth.onAuthStateChange(function (event, session) {
        try {
          callback(event, session, shapeUser(session && session.user));
        } catch (e) {
          console.error('[supabase] auth listener error', e);
        }
      });
      return function () {
        try { sub.data.subscription.unsubscribe(); } catch (e) {}
      };
    }
  };

  global.SupabaseAuth = SupabaseAuth;
})(window);
