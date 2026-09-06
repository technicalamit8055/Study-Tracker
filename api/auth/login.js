const { connectToDatabase } = require('../../lib/db');
const { comparePassword, generateToken } = require('../../lib/auth');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');

    const user = await usersCollection.findOne({ username: cleanUsername });
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const passwordMatch = await comparePassword(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const userId = user._id ? user._id.toString() : user.id;

    const token = generateToken({
      userId,
      username: user.username,
      name: user.name || user.username
    });

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: userId,
        username: user.username,
        name: user.name || user.username
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
};
