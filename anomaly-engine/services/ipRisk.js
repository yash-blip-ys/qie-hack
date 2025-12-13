const axios = require('axios');

/**
 * Returns:
 * {
 *   abuseConfidenceScore: number (0-100) or null,
 *   isProxy: boolean|null,
 *   isTor: boolean|null,
 *   country: "IN" | "...",
 *   message: 'ok' | 'error'
 * }
 */
async function checkIpRisk(ip) {
  const apiKey = process.env.ABUSEIPDB_API_KEY;
  if (!apiKey) {
    // graceful fallback if no API key — return safe default
    return { abuseConfidenceScore: null, isProxy: null, country: null, message: 'no_api_key' };
  }

  try {
    const url = `https://api.abuseipdb.com/api/v2/check?ipAddress=${encodeURIComponent(ip)}&maxAgeInDays=90`;
    const resp = await axios.get(url, {
      headers: { 'Key': apiKey, 'Accept': 'application/json' },
      timeout: 5000
    });
    const data = resp.data && resp.data.data ? resp.data.data : null;
    if (!data) return { abuseConfidenceScore: null, message: 'no_data' };
    return {
      abuseConfidenceScore: data.abuseConfidenceScore ?? null,
      isProxy: data.isProxy ?? null,
      isp: data.isp ?? null,
      country: data.countryCode ?? null,
      lastReportedAt: data.lastReportedAt ?? null,
      message: 'ok'
    };
  } catch (err) {
    console.warn('AbuseIPDB check failed', err?.response?.data || err.message);
    return { abuseConfidenceScore: null, message: 'api_error' };
  }
}

module.exports = { checkIpRisk };
