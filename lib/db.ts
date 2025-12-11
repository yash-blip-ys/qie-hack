import mongoose from 'mongoose';
import Redis from 'ioredis';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env.local'
  );
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: MongooseCache;
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const EVENT_QUEUE_KEY = 'qie:transfer-events';

export interface RedisQueuePayload {
  txHash: string;
  type: 'cross-border' | 'swap';
  sender: string;
  recipient: string | null;
  amountQUSD: string;
  targetCurrency: string | null;
  blockNumber: number;
  timestamp: number;
  chainId: number;
  metadata?: Record<string, any>;
}

declare global {
  var redisClient: Redis | undefined;
}

let redisClient: Redis | undefined = global.redisClient;

async function connectDB() {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not defined. Please add it to your .env.local file.');
  }

  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    const opts = { bufferCommands: false };
    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log("✅ New MongoDB Connection established");
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e: any) {
    cached.promise = null;
    console.error("❌ MongoDB Connection Error:", e.message);
    throw new Error(`Failed to connect to MongoDB: ${e.message}`);
  }
  return cached.conn;
}

function createRedisClient() {
  const client = new Redis(REDIS_URL);
  client.on('error', (error) => {
    console.error('Redis error:', error.message);
  });
  client.on('connect', () => {
    console.log('🟢 Connected to Redis queue');
  });
  return client;
}

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = createRedisClient();
    global.redisClient = redisClient;
  }
  return redisClient;
}

export async function enqueueTransferEvent(payload: RedisQueuePayload) {
  const client = getRedisClient();
  await client.lpush(EVENT_QUEUE_KEY, JSON.stringify(payload));
}

export async function dequeueTransferEvent(timeoutSeconds = 5): Promise<RedisQueuePayload | null> {
  const client = getRedisClient();
  const result = await client.brpop(EVENT_QUEUE_KEY, timeoutSeconds);
  if (!result) return null;
  const payload = result[1] as string;
  return JSON.parse(payload);
}

export default connectDB;

