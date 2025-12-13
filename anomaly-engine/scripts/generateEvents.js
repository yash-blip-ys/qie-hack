const axios = require('axios');

async function sendTest(amount, fingerprint, attempts=0) {
  const body = {
    wallet: "0x" + Math.random().toString(16).substring(2,8),
    action: "swap",
    amount,
    fingerprint,
    metadata: {
      walletCreatedAt: "2025-12-03T12:00:00Z",
      recentAttempts: attempts,
      fingerprintAssociatedCount: attempts >= 5 ? 4 : 1
    }
  };

  const r = await axios.post("http://localhost:4000/api/event", body);
  console.log("Sent:", body);
  console.log("Received:", r.data);
}

(async () => {
  console.log("Generating synthetic events...");
  await sendTest(50, "fp1", 1);
  await sendTest(500, "fp1", 3);
  await sendTest(2000, "fp2", 10);
  await sendTest(3000, "fp3", 7);
})();
