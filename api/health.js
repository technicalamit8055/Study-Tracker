const { connectToDatabase } = require('../lib/db');

module.exports = async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { isLocal, error } = await connectToDatabase();
    return res.status(200).json({
      status: 'ok',
      service: 'Bihar STET 2026 Psychology Tracker API',
      timestamp: new Date().toISOString(),
      database: isLocal ? 'local_fallback' : 'mongodb_atlas_connected',
      dbError: error || null,
      environment: process.env.VERCEL ? 'vercel_serverless' : 'local_dev'
    });
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};
