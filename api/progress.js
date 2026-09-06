const { getAuthUser } = require('../lib/auth');
const { connectToDatabase } = require('../lib/db');

// Exam that pre-multi-exam progress documents belong to. Legacy rows were
// written before examId existed, and all of them were Bihar STET progress.
const LEGACY_EXAM_ID = 'bihar-stet-psychology';

function isPlainObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

function emptyPayload(examId) {
  return {
    examId,
    userState: {},
    stats: null,
    timer: null,
    lastUpdated: null
  };
}

function serialize(doc, examId) {
  return {
    examId: doc.examId || examId,
    userState: doc.userState || {},
    stats: doc.stats || null,
    timer: doc.timer || null,
    lastUpdated: doc.lastUpdated || null
  };
}

/**
 * Progress is stored one document per (userId, examId) pair so that
 * progress for one exam can never collide with another.
 *
 * GET  /api/progress?examId=<id>  -> that exam's progress
 * GET  /api/progress?all=1        -> every exam's progress for this user
 * POST /api/progress              -> { examId, userState, stats, timer }
 */
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

    if (req.method === 'GET') {
      const wantsAll = req.query && (req.query.all === '1' || req.query.all === 'true');
      const examId = (req.query && req.query.examId) || LEGACY_EXAM_ID;

      if (wantsAll) {
        const docs = await progressCollection.find({ userId: auth.userId });
        const list = Array.isArray(docs) ? docs : [];
        return res.status(200).json({
          progress: list.map(d => serialize(d, d.examId || LEGACY_EXAM_ID))
        });
      }

      let doc = await progressCollection.findOne({ userId: auth.userId, examId });

      // One-time migration: adopt the pre-multi-exam document (no examId)
      // as this user's Bihar STET progress.
      if (!doc && examId === LEGACY_EXAM_ID) {
        const legacy = await progressCollection.findOne({ userId: auth.userId, examId: null });
        if (legacy && legacy.userState && Object.keys(legacy.userState).length > 0) {
          doc = legacy;
          await progressCollection.updateOne(
            { userId: auth.userId, examId: null },
            { $set: { examId: LEGACY_EXAM_ID } }
          );
        }
      }

      if (!doc) {
        return res.status(200).json(emptyPayload(examId));
      }

      return res.status(200).json(serialize(doc, examId));
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      const body = req.body || {};
      const { userState, stats, timer } = body;
      const examId = body.examId || LEGACY_EXAM_ID;

      if (!isPlainObject(userState)) {
        return res.status(400).json({ error: 'Invalid userState payload.' });
      }
      if (typeof examId !== 'string' || !examId.trim()) {
        return res.status(400).json({ error: 'Invalid examId.' });
      }

      const now = new Date();
      await progressCollection.updateOne(
        { userId: auth.userId, examId },
        {
          $set: {
            userId: auth.userId,
            username: auth.username,
            examId,
            userState,
            stats: isPlainObject(stats) ? stats : {},
            timer: isPlainObject(timer) ? timer : {},
            lastUpdated: now
          }
        },
        { upsert: true }
      );

      return res.status(200).json({
        success: true,
        examId,
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
