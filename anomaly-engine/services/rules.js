/**
 * Simple rule engine:
 * Accepts { event, ipRisk }, returns { verdict, score, reasons }
 *
 * Scoring scheme: sum of rule weights -> convert to verdict
 * - score >= 70 => ANOMALY
 * - 40 <= score < 70 => SUSPICIOUS
 * - < 40 => CLEAR
 */

function walletAgeDays(walletMetadata) {
  // walletMetadata.walletCreatedAt in ISO or timestamp (optional)
  if (!walletMetadata || !walletMetadata.walletCreatedAt) return null;
  const created = new Date(walletMetadata.walletCreatedAt);
  const diff = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
  return diff;
}

async function evaluateRules({ event, ipRisk }) {
  let score = 0;
  const reasons = [];

  // RULE: High IP abuse score
  if (ipRisk && ipRisk.abuseConfidenceScore != null) {
    const s = ipRisk.abuseConfidenceScore; // 0-100
    if (s >= 75) { score += 50; reasons.push('High IP abuseConfidenceScore'); }
    else if (s >= 40) { score += 25; reasons.push('Moderate IP abuse score'); }
    else if (s >= 10) { score += 10; }
  }

  // RULE: Proxy/TOR detection (AbuseIPDB fields)
  if (ipRisk && ipRisk.isProxy) { score += 30; reasons.push('IP flagged as proxy/VPN/Tor'); }

  // RULE: New wallet performing high amount
  const walletAge = walletAgeDays(event.metadata);
  if (walletAge !== null) {
    if (walletAge <= 2 && (event.amount || 0) >= 100) { score += 40; reasons.push('New wallet performing high-value txn'); }
    else if (walletAge <= 7 && (event.amount || 0) >= 500) { score += 35; reasons.push('Very new wallet with large txn'); }
  } else {
    // If wallet metadata not present, penalize a bit for missing signals
    if ((event.amount || 0) >= 100) { score += 10; reasons.push('Missing wallet age metadata'); }
  }

  // RULE: High velocity / repeated attempts (you can track counts in DB; here we check event.metadata.attempts)
  if (event.metadata && event.metadata.recentAttempts && event.metadata.recentAttempts >= 5) {
    score += 30;
    reasons.push('High recent attempts from same fingerprint/wallet');
  }

  // RULE: Fingerprint reuse across many wallets (front-end should supply fingerprintCount)
  if (event.metadata && event.metadata.fingerprintAssociatedCount && event.metadata.fingerprintAssociatedCount >= 3) {
    score += 30;
    reasons.push('Fingerprint associated with multiple wallets');
  }

  // RULE: Unusual geolocation: user's wallet previously used in other country
  if (event.metadata && event.metadata.lastKnownCountry && ipRisk && ipRisk.country && event.metadata.lastKnownCountry !== ipRisk.country) {
    score += 20;
    reasons.push('Geo mismatch between previous usage and current IP');
  }

  // RULE: Action type weight
  if (event.action === 'swap' && (event.amount || 0) > 1000) { score += 40; reasons.push('Very large swap'); }
  if (event.action === 'send' && (event.amount || 0) > 2000) { score += 50; reasons.push('Very large send'); }

  // Normalize final verdict
  let verdict = 'CLEAR';
  if (score >= 70) verdict = 'ANOMALY';
  else if (score >= 40) verdict = 'SUSPICIOUS';

  return { verdict, score, reasons };
}

module.exports = { evaluateRules };
