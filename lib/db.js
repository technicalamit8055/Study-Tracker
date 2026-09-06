const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

let cachedClient = null;
let cachedDb = null;

// Local fallback file store for development when no MongoDB URI is set
const LOCAL_DATA_DIR = path.join(__dirname, '..', 'data');
const LOCAL_DATA_FILE = path.join(LOCAL_DATA_DIR, 'local_db.json');

function initLocalStore() {
  if (!fs.existsSync(LOCAL_DATA_DIR)) {
    try {
      fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
    } catch (e) {
      // Ephemeral environments like Vercel read-only filesystem
    }
  }
  if (!fs.existsSync(LOCAL_DATA_FILE)) {
    try {
      fs.writeFileSync(LOCAL_DATA_FILE, JSON.stringify({ users: [], progress: [] }, null, 2));
    } catch (e) {}
  }
}

function readLocalStore() {
  try {
    initLocalStore();
    if (fs.existsSync(LOCAL_DATA_FILE)) {
      const content = fs.readFileSync(LOCAL_DATA_FILE, 'utf8');
      return JSON.parse(content || '{"users":[],"progress":[]}');
    }
  } catch (e) {
    console.warn('Local store read error, using memory fallback:', e.message);
  }
  return global._memoryStore || (global._memoryStore = { users: [], progress: [] });
}

function writeLocalStore(data) {
  global._memoryStore = data;
  try {
    initLocalStore();
    fs.writeFileSync(LOCAL_DATA_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    // Graceful on serverless environments where disk is read-only
  }
}

// Fallback Collection interface mimicking MongoDB API
class LocalCollection {
  constructor(name) {
    this.name = name;
  }

  async findOne(query) {
    const data = readLocalStore();
    const list = data[this.name] || [];
    return list.find(item => {
      for (const key of Object.keys(query)) {
        if (item[key] !== query[key]) return false;
      }
      return true;
    }) || null;
  }

  async insertOne(doc) {
    const data = readLocalStore();
    if (!data[this.name]) data[this.name] = [];
    const newDoc = { ...doc, _id: doc._id || `local_${Date.now()}_${Math.random().toString(36).substr(2, 6)}` };
    data[this.name].push(newDoc);
    writeLocalStore(data);
    return { insertedId: newDoc._id };
  }

  async updateOne(query, update, options = {}) {
    const data = readLocalStore();
    if (!data[this.name]) data[this.name] = [];
    let itemIndex = data[this.name].findIndex(item => {
      for (const key of Object.keys(query)) {
        if (item[key] !== query[key]) return false;
      }
      return true;
    });

    if (itemIndex >= 0) {
      const existing = data[this.name][itemIndex];
      const updated = { ...existing };
      if (update.$set) Object.assign(updated, update.$set);
      data[this.name][itemIndex] = updated;
      writeLocalStore(data);
      return { matchedCount: 1, modifiedCount: 1 };
    } else if (options.upsert) {
      const newDoc = { ...query, ...(update.$set || {}), _id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 6)}` };
      data[this.name].push(newDoc);
      writeLocalStore(data);
      return { matchedCount: 0, upsertedId: newDoc._id };
    }
    return { matchedCount: 0, modifiedCount: 0 };
  }
}

class LocalDbFallback {
  constructor() {
    this.isLocalFallback = true;
  }
  collection(name) {
    return new LocalCollection(name);
  }
}

/**
 * Connect to MongoDB Atlas with Serverless Connection Pooling
 * or fallback to persistent local store if MONGODB_URI is not set.
 */
async function connectToDatabase() {
  const uri = process.env.MONGODB_URI;

  // Use local fallback if no URI provided
  if (!uri || uri.trim() === '') {
    return {
      client: null,
      db: new LocalDbFallback(),
      isLocal: true,
      message: 'Running in Local Fallback Mode (MONGODB_URI not configured).'
    };
  }

  // Reuse cached connection if available
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb, isLocal: false };
  }

  try {
    const client = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });

    await client.connect();
    const db = client.db(process.env.MONGODB_DB || 'stet_tracker');

    // Cache instances
    cachedClient = client;
    cachedDb = db;

    // Create index on users email/username if possible
    try {
      await db.collection('users').createIndex({ username: 1 }, { unique: true });
      await db.collection('progress').createIndex({ userId: 1 }, { unique: true });
    } catch (idxErr) {}

    return { client, db, isLocal: false };
  } catch (error) {
    console.error('MongoDB connection error, falling back to local mode:', error.message);
    return {
      client: null,
      db: new LocalDbFallback(),
      isLocal: true,
      error: error.message
    };
  }
}

module.exports = {
  connectToDatabase
};
