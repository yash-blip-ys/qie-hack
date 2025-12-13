const { MongoClient } = require('mongodb');
let dbClient = null;
let eventsCollection = null;

async function initDb() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI not set');
  dbClient = new MongoClient(uri, { useUnifiedTopology: true });
  await dbClient.connect();
  const db = dbClient.db(); // default DB from URI or 'test'
  eventsCollection = db.collection('events');
  // Add indexes for queries
  await eventsCollection.createIndex({ "event.wallet": 1 });
  await eventsCollection.createIndex({ "createdAt": -1 });
  console.log('MongoDB connected');
}

async function insertEvent(doc) {
  if (!eventsCollection) throw new Error('DB not initialized');
  const r = await eventsCollection.insertOne(doc);
  return r;
}

async function getFingerprintCount(fp) {
  return eventsCollection.countDocuments({ "event.fingerprint": fp });
}

function getEventsCollection() {
  if (!eventsCollection) throw new Error('DB not initialized');
  return eventsCollection;
}

async function listRecentEvents(limit = 20) {
  const collection = getEventsCollection();
  return collection
    .find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}

module.exports = { initDb, insertEvent, getFingerprintCount, listRecentEvents };
