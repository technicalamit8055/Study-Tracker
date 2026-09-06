/**
 * GET /api/config
 *
 * Serves the browser its public Supabase credentials so a deployment can point
 * at a different project by setting env vars, with no rebuild. Only public
 * values are ever returned here — never the service-role key.
 */
module.exports = function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.status(204).end();
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  var url = (process.env.SUPABASE_URL || '').trim()
    .replace(/\/+$/, '')
    .replace(/\/rest\/v1$/, '')
    .replace(/\/auth\/v1$/, '');
  var anonKey = (process.env.SUPABASE_ANON_KEY || '').trim();

  // Short cache: these change only on redeploy, but a stale key would lock
  // students out, so keep the window small.
  res.setHeader('Cache-Control', 'public, max-age=60');
  return res.status(200).json({
    supabase: {
      url: url,
      anonKey: anonKey,
      configured: !!(url && anonKey)
    }
  });
};
