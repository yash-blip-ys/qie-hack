require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');

const { initDb, insertEvent, getFingerprintCount, listRecentEvents } = require('./services/db');
const { enqueueEvent } = require('./services/queue');
const { checkIpRisk } = require('./services/ipRisk');
const { evaluateRules } = require('./services/rules');

const app = express();
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(bodyParser.json());

// Initialize DB
initDb().catch(err => {
  console.error('Failed to initialize DB', err);
  process.exit(1);
});

/**
 * Example endpoint your front-end will call after wallet connect / user action.
 * Body expected:
 * {
 *   "wallet": "0xabc..",
 *   "action": "swap" | "connect" | "send",
 *   "amount": 120.5,          // optional numeric amount in QIE
 *   "currency": "QIE",
 *   "fingerprint": "<fpjs_visitor_id>",
 *   "metadata": { ... }       // optional extra telemetry (ua, tz, device, etc)
 * }
 */
app.post('/api/event', async (req, res) => {
  try {
    const event = req.body;
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip;

    // Basic enrichment
    event.ip = Array.isArray(ip) ? ip[0] : ip;
    event.arrivedAt = new Date().toISOString();

    // 1) IP risk check
    const ipRisk = await checkIpRisk(event.ip);

    // 2) Evaluate rule-based heuristics (returns flags + score)
    const { verdict, score, reasons } = await evaluateRules({
      event,
      ipRisk
    });

    // 3) Persist to Mongo and enqueue to Redis for asynchronous processing / alerting
    const doc = {
      event,
      ipRisk,
      verdict,
      score,
      reasons,
      createdAt: new Date()
    };
    await insertEvent(doc);
    await enqueueEvent(doc);

    // 4) Response for dashboard
    const resp = {
      status: 'ok',
      verdict,      // "ANOMALY" | "SUSPICIOUS" | "CLEAR"
      score,        // numerical score (higher = riskier)
      reasons,      // array of strings explaining flags
      ipRisk
    };

    return res.json(resp);
  } catch (err) {
    console.error('error /api/event', err);
    return res.status(500).json({ status: 'error', message: 'internal_server_error' });
  }
});

app.get('/api/events/recent', async (req, res) => {
  try {
    const limitParam = parseInt(req.query.limit, 10);
    const limit = Number.isNaN(limitParam) ? 20 : Math.min(50, Math.max(5, limitParam));
    const events = await listRecentEvents(limit);
    const summary = events.reduce(
      (acc, doc) => {
        acc[doc.verdict] = (acc[doc.verdict] || 0) + 1;
        return acc;
      },
      { ANOMALY: 0, SUSPICIOUS: 0, CLEAR: 0 }
    );
    return res.json({ data: events, summary });
  } catch (err) {
    console.error('error /api/events/recent', err);
    return res.status(500).json({ status: 'error', message: 'internal_server_error' });
  }
});

app.get('/api/fingerprint/count/:fp', async (req, res) => {
  try {
    const fp = req.params.fp;
    const count = await getFingerprintCount(fp);
    res.json({ fingerprint: fp, associatedWallets: count });
  } catch (err) {
    res.status(500).json({ error: 'internal_error' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Anomaly middleware listening on ${PORT}`));
