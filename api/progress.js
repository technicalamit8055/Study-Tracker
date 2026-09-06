const { getAuthUser } = require('../lib/auth');
const { connectToDatabase } = require('../lib/db');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const auth = getAuthUser(req);
  if (!auth || !auth.userId) {
    return res.status(401).json({ error: 'Unauthorized. Please login to save or sync your progress.' });
  }

  try {
    const { db } = await connectToDatabase();
    const progressCollection = db.collection('progress');

    // GET /api/progress -> Retrieve user's syllabus state
    if (req.method === 'GET') {
      const doc = await progressCollection.findOne({ userId: auth.userId });
      if (!doc) {
        return res.status(200).json({
          userState: {},
          lastUpdated: null,
          stats: null,
          timer: null
        });
      }

      return res.status(200).json({
        userState: doc.userState || {},
        lastUpdated: doc.lastUpdated || null,
        stats: doc.stats || null,
        timer: doc.timer || null
      });
    }

    // POST or PUT /api/progress -> Save/sync user's syllabus state
    if (req.method === 'POST' || req.method === 'PUT') {
      const { userState, stats, timer } = req.body || {};

      if (!userState || typeof userState !== 'object') {
        return res.status(400).json({ error: 'Invalid userState payload.' });
      }

      const now = new Date();
      await progressCollection.updateOne(
        { userId: auth.userId },
        {
          $set: {
            userId: auth.userId,
            username: auth.username,
            userState,
            stats: stats || {},
            timer: timer || {},
            lastUpdated: now
          }
        },
        { upsert: true }
      );

      return res.status(200).json({
        success: true,
        message: 'Progress synced successfully',
        lastUpdated: now.toISOString()
      });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error) {
    console.error('Progress sync error:', error);
    return res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
};
