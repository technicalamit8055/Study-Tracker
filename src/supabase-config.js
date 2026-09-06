/**
 * ExamRoadmap - Supabase client configuration
 *
 * Values here are the *public* project URL and anon key. They are safe to ship
 * to the browser: every table is protected by Row Level Security, so the anon
 * key alone can only read and write rows belonging to the signed-in user.
 *
 * The server may override these at runtime by injecting `window.__SUPABASE__`
 * (see /api/config), which lets a deployment point at a different project
 * without editing this file.
 */
(function (global) {
  'use strict';

  var injected = global.__SUPABASE__ || {};

  // A bare project URL — no /rest/v1 suffix; supabase-js appends its own paths.
  var DEFAULT_URL = 'https://iuokemxedggkbawkvqft.supabase.co';
  var DEFAULT_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1b2tlbXhlZGdna2Jhd2t2cWZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3MDMyOTQsImV4cCI6MjEwNDI3OTI5NH0.6V5SwUsDZ9gZQ-pLvVaKW3dRDXSy26D5q4k5_gVUngE';

  /** Tolerate a pasted REST endpoint by trimming back to the project origin. */
  function normalizeUrl(url) {
    if (!url || typeof url !== 'string') return '';
    var clean = url.trim().replace(/\/+$/, '');
    clean = clean.replace(/\/rest\/v1$/, '').replace(/\/auth\/v1$/, '');
    return clean;
  }

  var SupabaseConfig = {
    url: normalizeUrl(injected.url || DEFAULT_URL),
    anonKey: (injected.anonKey || DEFAULT_ANON_KEY || '').trim(),

    /** True when both credentials look present and plausibly well-formed. */
    isConfigured: function () {
      return !!(SupabaseConfig.url &&
        /^https:\/\/[^/]+/.test(SupabaseConfig.url) &&
        SupabaseConfig.anonKey &&
        SupabaseConfig.anonKey.length > 40);
    },

    /** Table holding per-user, per-exam progress (see scripts/supabase_schema.sql). */
    progressTable: 'user_progress',

    /**
     * Ask the server for its env-configured credentials and adopt them if they
     * differ from the built-in defaults. Called once during boot, before the
     * client is first initialised, so a deployment can retarget projects via
     * env vars alone. Failure is silent and harmless — the defaults stand.
     */
    refreshFromServer: async function () {
      try {
        var res = await fetch('/api/config', { cache: 'no-store' });
        if (!res.ok) return false;
        var data = await res.json();
        var sb = (data && data.supabase) || {};
        if (!sb.url || !sb.anonKey) return false;

        var url = normalizeUrl(sb.url);
        if (url === SupabaseConfig.url && sb.anonKey === SupabaseConfig.anonKey) {
          return false;
        }
        SupabaseConfig.url = url;
        SupabaseConfig.anonKey = sb.anonKey.trim();
        return true;
      } catch (e) {
        return false;
      }
    }
  };

  if (!SupabaseConfig.isConfigured()) {
    console.warn(
      '[supabase] Not configured — the app runs in local-only mode.\n' +
      'Set SUPABASE_URL and SUPABASE_ANON_KEY in .env (or edit src/supabase-config.js).'
    );
  }

  global.SupabaseConfig = SupabaseConfig;
})(window);
