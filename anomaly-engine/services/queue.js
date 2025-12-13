const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const QUEUE_KEY = 'anomaly:queue';

async function enqueueEvent(doc) {
  // Push to Redis list (LPUSH) for worker to process
  await redis.lpush(QUEUE_KEY, JSON.stringify({
    id: doc._id || null,
    event: doc.event,
    verdict: doc.verdict,
    score: doc.score,
    createdAt: doc.createdAt
  }));
  // Optionally set TTL or notification (pub/sub)
  await redis.publish('anomaly:channel', JSON.stringify({ id: doc._id || null }));
}

module.exports = { enqueueEvent, redis };
