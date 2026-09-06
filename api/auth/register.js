const { connectToDatabase } = require('../../lib/db');
const { hashPassword, generateToken } = require('../../lib/auth');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { username, password, name } = req.body || {};

    if (!username || typeof username !== 'string' || username.trim().length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters long.' });
    }

    if (!password || typeof password !== 'string' || password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters long.' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');

    // Check if user already exists
    const existing = await usersCollection.findOne({ username: cleanUsername });
    if (existing) {
      return res.status(409).json({ error: 'Username or email already registered. Please login.' });
    }

    const hashedPassword = await hashPassword(password);
    const newUser = {
      username: cleanUsername,
      name: (name && name.trim()) || cleanUsername,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await usersCollection.insertOne(newUser);
    const userId = result.insertedId ? result.insertedId.toString() : newUser._id;

    const token = generateToken({
      userId,
      username: cleanUsername,
      name: newUser.name
    });

    return res.status(201).json({
      message: 'Account created successfully',
      token,
      user: {
        id: userId,
        username: cleanUsername,
        name: newUser.name
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
};
