require('dotenv').config();
const { redis } = require('../services/queue');
const axios = require('axios');

const QUEUE_KEY = 'anomaly:queue';
const ADMIN_WEBHOOK_URL = process.env.ADMIN_DASHBOARD_WEBHOOK_URL;

async function processQueue() {
  console.log('Alert worker started...');

  if (!ADMIN_WEBHOOK_URL) {
    console.warn('ADMIN_DASHBOARD_WEBHOOK_URL is not defined; alerts will not be forwarded.');
  }

  while (true) {
    const item = await redis.brpop(QUEUE_KEY, 0);
    const data = JSON.parse(item[1]);

    if (data.verdict === 'ANOMALY') {
      console.log('ALERT: High-risk event detected!', data);

      if (!ADMIN_WEBHOOK_URL) {
        continue;
      }

      await axios.post(ADMIN_WEBHOOK_URL, {
        alertId: data.id,
        score: data.score,
        verdict: data.verdict,
        createdAt: data.createdAt,
        event: data.event
      });
    }
  }
}

processQueue();
