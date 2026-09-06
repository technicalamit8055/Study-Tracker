const { getAuthUser } = require('../../lib/auth');
const { connectToDatabase } = require('../../lib/db');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const auth = getAuthUser(req);
    if (!auth || !auth.userId) {
      return res.status(401).json({ error: 'Unauthorized. Please login.' });
    }

    const { db } = await connectToDatabase();
    const user = await db.collection('users').findOne({ username: auth.username });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({
      user: {
        id: auth.userId,
        username: user.username,
        name: user.name || user.username,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Session verify error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
